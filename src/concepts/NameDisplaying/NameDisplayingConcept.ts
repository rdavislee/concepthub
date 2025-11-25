import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

// External parameter types
export type Item = ID;
export type User = ID; // present in signature but unused in state/actions

// Internal identity equals the concept_id
export type Concept = ID;

const PREFIX = "NameDisplaying" + ".";

interface ConceptDoc {
  _id: Concept; // concept_id
  displayName: string;
}

/**
 * @concept NameDisplaying
 * @purpose Maintain human-friendly display names for concepts so they can be shown, updated, or cleared while remaining linked to their underlying concept identities.
 * @principle Each concept may have a single display name that can be set/changed, removed, and searched by partial match.
 * @state a set of Concept with a concept_id Item and a display_name String
 */
export default class NameDisplayingConcept {
  concepts: Collection<ConceptDoc>;

  constructor(private readonly db: Db) {
    this.concepts = this.db.collection<ConceptDoc>(PREFIX + "concepts");
  }

  /**
   * Action: change_name (concept_id: Item, display_name: String) : (ok: Flag)
   * requires: display_name is non-empty
   * effects: set or update display_name for concept_id (upsert)
   */
  async change_name(
    { conceptId, displayName }: { conceptId: Concept; displayName: string },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!conceptId) {
      return { error: "concept_id is required" };
    }
    if (!displayName?.trim()) {
      return { error: "display_name must be non-empty" };
    }
    await this.concepts.updateOne(
      { _id: conceptId },
      { $set: { _id: conceptId, displayName } },
      { upsert: true },
    );
    return { ok: true };
  }

  /**
   * Action: remove (concept_id: Item) : (ok: Flag)
   * requires: concept_id exists in the set
   * effects: delete that concept's display name entry
   */
  async remove(
    { conceptId }: { conceptId: Concept },
  ): Promise<{ ok: boolean } | { error: string }> {
    if (!conceptId) {
      return { error: "concept_id is required" };
    }
    const result = await this.concepts.deleteOne({ _id: conceptId });
    if (result.deletedCount === 0) {
      return { error: "concept_id not found" };
    }
    return { ok: true };
  }

  /**
   * Action: search (text: String) : (concept_id: Item, display_name: String)
   * requires: true
   * effects: none (read-only); returns concepts whose display_name includes text (case-insensitive)
   */
  async search(
    { text }: { text: string },
  ): Promise<Array<{ conceptId: Concept; displayName: string }>> {
    const query = (text ?? "").trim().toLowerCase();
    // If empty, return all concepts.
    const docs = await this.concepts.find({})
      .project({ _id: 1, displayName: 1 })
      .toArray();
    if (!query) {
      return docs.map((d) => ({
        conceptId: d._id as Concept,
        displayName: d.displayName,
      }));
    }
    // Case-insensitive subsequence match: all chars of query appear in order in displayName.
    const matches = docs.filter((d) => {
      const name = d.displayName.toLowerCase();
      let i = 0;
      for (const c of name) {
        if (c === query[i]) i++;
        if (i === query.length) return true;
      }
      return false;
    });
    return matches.map((d) => ({
      conceptId: d._id as Concept,
      displayName: d.displayName,
    }));
  }
}
