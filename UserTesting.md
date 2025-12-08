# User Tesing


## Task List for User Testing

| Task Title | Instruction to User | Rationale |
|-----------|----------------------|-----------|
| **1. Create an Account & Log In** | “Please create a new account on the platform, then log in.” | Tests whether onboarding is intuitive and whether users can cross the initial gulf of execution. Necessary setup for later tasks requiring authentication. |
| **2. Explore a Concept Page** | “Find any concept that looks interesting and open its concept page. Tell me what you think it does.” | Evaluates whether concept metadata, descriptions, and documentation enable users to understand a concept’s purpose without explanation. Tests gulf of evaluation. |
| **3. Download a Concept** | “Download the concept you are currently viewing.” | Tests discoverability of the download action, clarity of the concept page layout, and the user’s understanding of the meaning of ‘downloading’ a backend concept. Also validates interaction for download tracking. |
| **4. Like a Concept** | “Like this concept.” | Checks visibility and intuitiveness of the social features (likes), and ensures consistency with mental models from GitHub/HuggingFace. |
| **5. Search for a Concept** | “Use the search bar to find a concept related to ‘authentication.’ Open whichever result looks most relevant.” | Tests search discoverability, search ranking clarity, and whether concept naming/metadata support quick identification. Helps uncover navigation or labeling confusion. |
| **6. Upload a New Concept** | “Upload a new concept using the sample file named ‘MyAuthDemo,’ and fill in the required fields.” | The publishing flow is core to the app. This tests whether the upload UI provides enough guidance, whether users understand required metadata, and whether the interaction flow is comprehensible. |
| **7. Edit a Concept's Display Name** | “Edit the display name of the concept you just uploaded.” | Tests whether users can correctly identify editable metadata, understand the distinction between internal IDs and display names, and use the editing interface intuitively. |
| **8. View Your Profile & Activity** | “Go to your profile and view your liked concepts, downloaded concepts, and uploaded concepts.” | Tests whether navigation and information grouping make sense and whether users can understand how their activity is organized across the platform. |
| **9. Compare Two Concepts** | “Compare two different concepts—one you’ve interacted with already and one you haven’t. Decide which you would use and why.” | Tests whether concept detail pages clearly communicate quality, purpose, trustworthiness, and differentiating factors. Reveals UI strengths/weaknesses in presenting metadata. |



## Summary of Lessons (User Test 1)

The participant was able to navigate the interface with relatively little direct guidance, suggesting that the platform’s overall layout is reasonably intuitive. However, their tone and reactions revealed several moments of confusion and subtle frustration that point to deeper issues in system feedback and conceptual clarity. The most notable breakdown occurred during the account creation process: after submitting the form, the participant received a “Registration failed. Try again” message but then realized they were somehow logged in anyway. Their confused remarks—“What am I supposed to do?” and “Okay… I’m signed in? I think?”—paired with an audible pause and hesitation, showed a clear gulf of evaluation: system feedback did not accurately reflect the true system state, leaving them unsure whether their action succeeded.

Once inside the platform, the participant quickly found the Concepts tab, indicating that top-level navigation is discoverable. Yet, upon opening a concept, they expressed uncertainty and mild overwhelm, saying, “It gives you code… like three different files. I don’t know what this is,” accompanied by a noticeable shift in their speaking pace. This suggests that while the layout is navigable, the conceptual scaffolding for understanding backend components is insufficient for first-time users. Search functionality generated the most evident struggle. The participant repeatedly typed queries into the upper search bar and noted, “Nothing happening,” before later discovering that a separate search bar actually performed concept searches. Their sighs and rising confusion implied a gulf of execution breakdown—they could not determine which control mapped to which action.

A similar issue occurred during concept uploading, where an error surfaced without any explanatory detail, prompting the comment, “I don’t know what’s failing.” Despite these challenges, the participant remained engaged and successfully downloaded, browsed, and interacted with concepts, showing that the core flows are workable. The overall session revealed strong foundational navigation but highlighted a need for clearer system feedback, better labeling, and more contextual explanation to support user understanding.


## Summary of Lessons (User Test 2)

This participant moved smoothly and confidently through nearly all tasks, demonstrating that the platform works especially well for users who have strong prior familiarity with development tools or technical interfaces. Their tone throughout the session was calm and matter-of-fact, and there were no noticeable pauses or points of visible confusion during sign-up. Unlike the first participant, they encountered no issues with onboarding—stating, “Everything is working… I log in as me essentially”—suggesting that the authentication flow, when functioning correctly, effectively bridges the gulf of evaluation and provides clear, reassuring feedback.

When navigating to the Concepts page, the participant immediately located and opened the User Authentication concept. Their articulate interpretation—“It handles storing usernames and passwords… running as the authentication provider”—showed that the metadata and file structure provided just enough context for a technically comfortable user to infer meaning. Their fluent pacing, lack of hesitation, and descriptive language implied strong comprehension and minimal cognitive friction. Downloading the concept also went smoothly, confirmed by their observation about receiving “a zip… with multiple files,” indicating that the affordances around concept versions and downloads were clear.

In searching for additional concepts, the participant located an “event directory” and opened it without difficulty. Although the audio ended early, their consistent pattern of confident navigation suggests that they would have completed the remaining tasks—uploading a concept, editing metadata, and checking their profile—without major obstacles. Their final recorded comment, “I can see my contribution,” indicates satisfaction and successful mapping between their actions and the system’s representation of activity.

Overall, this participant’s experience highlights the platform’s strengths when used by someone with pre-existing technical intuition: navigation feels natural, concepts are interpretable, and interaction flows behave predictably. At the same time, the contrast with User Test 1 reinforces that clearer system feedback, stronger error messaging, and more onboarding guidance would help bridge the gap for users who do not enter with the same level of technical confidence.


## Flaws & Opportunities for Improvement

### 1. Inconsistent and Misleading Authentication Feedback
**What it is:** During User Test 1, the system reported “Registration failed” even though the account was successfully created and the participant was logged in.  
**Why it happened:** The frontend appears to surface a generic error while the backend still completes account creation, causing the system state to diverge from the message shown. The participant’s confusion (“What am I supposed to do?”) shows a breakdown in the gulf of evaluation.  
**How to address:** Ensure client-side validation and backend responses are synchronized. Replace generic errors with precise feedback (“Passwords do not match,” “Username already taken”) and provide an explicit success confirmation. Adding inline validation would also reduce uncertainty before submission.

---

### 2. Insufficient Concept Explanations and Context
**What it is:** Multiple participants struggled to understand the purpose and structure of concept files. User 1 stated, “I don’t know what this is,” while User 2 succeeded largely because of prior technical intuition.  
**Why it happened:** Concept pages display code immediately without a high-level overview, examples, or diagrams. This creates unnecessary cognitive load for inexperienced users and forces them to infer intent from raw code.  
**How to address:** Add a “Concept Overview” section summarizing the goal, inputs, outputs, and dependencies. Include a short description of each file and a small example sync diagram. This will help bridge the gap for users without strong backend experience.

---

### 3. Ambiguous or Conflicting Search Interfaces
**What it is:** User 1 encountered two search bars and only accidentally discovered which one performed concept lookup (“When I use the lower search bar, it works”).  
**Why it happened:** The existence of two visually similar search fields creates a gulf of execution problem because users cannot tell which search scope corresponds to which operation.  
**How to address:** Consolidate the search functionality into a single, prominent search bar. If multiple scopes are required, label them clearly (“Search Concepts” vs. “Search Site”) and differentiate them visually.

---

### 4. Unclear Affordances for Incomplete or Nonfunctional Navigation Items
**What it is:** User 1 noted that clicking “Features” produced no visible change. This created uncertainty about whether the page was broken or simply unimplemented.  
**Why it happened:** Nonfunctional links are styled identically to active navigation items, offering no indication of their status.  
**How to address:** Disable unimplemented tabs using greyed-out styles, tooltips like “Coming soon,” or placeholder content explaining the feature’s purpose and development status. This sets proper expectations and prevents users from assuming the interface is malfunctioning.





