// import { actions, Sync } from "@engine";
// import { ConceptRegistering, NameDisplaying } from "@concepts";

// // Auto-name on reserve (default display name = uniqueName)
// export const AutoNameOnReserve: Sync = ({ concept, uniqueName }) => ({
//   when: actions(
//     [ConceptRegistering.reserveName, { uniqueName }, { concept }],
//   ),
//   then: actions([
//     NameDisplaying.change_name,
//     { conceptId: concept, displayName: uniqueName },
//   ]),
// });

// // Restore name to uniqueName if cleared
// export const RestoreNameIfCleared: Sync = (
//   { item, ok, uniqueName },
// ) => ({
//   when: actions([NameDisplaying.remove, { conceptId: item }, { ok }]),
//   where: (frames) =>
//     frames.query(
//       ConceptRegistering._getUniqueName,
//       { concept: item },
//       { uniqueName },
//     ),
//   then: actions([
//     NameDisplaying.change_name,
//     { conceptId: item, displayName: uniqueName },
//   ]),
// });
