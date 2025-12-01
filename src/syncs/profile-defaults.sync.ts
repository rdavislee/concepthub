import { actions, Sync } from "@engine";
import {
  Requesting,
  UserAuthenticating,
  UserProfileDisplaying,
} from "@concepts";

// Create user profile on register with name and username
// This sync matches on both the register request (to get name and username)
// and the successful registration (to get the user ID)
export const CreateProfileOnRegister: Sync = ({
  request,
  user,
  name,
  username,
}) => ({
  when: actions(
    [Requesting.request, { path: "/auth/register", name, username }, {
      request,
    }],
    [UserAuthenticating.register, {}, { user }],
  ),
  then: actions([UserProfileDisplaying.setProfile, {
    user,
    username,
    displayName: name,
  }]),
});
