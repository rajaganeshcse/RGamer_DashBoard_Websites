import { getAuth } from "firebase/auth";

export async function isAdminUser() {

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return false;

  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}
