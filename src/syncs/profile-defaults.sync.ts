import { actions, Sync } from "@engine";
import { UserAuthenticating, UserProfileDisplaying } from "@concepts";

// Set default display name on register
export const DefaultDisplayNameOnRegister: Sync = (
  { user, username, password },
) => ({
  when: actions(
    [UserAuthenticating.register, { username, password }, { user }],
  ),
  then: actions([UserProfileDisplaying.setDisplayName, {
    user,
    name: username,
  }]),
});
