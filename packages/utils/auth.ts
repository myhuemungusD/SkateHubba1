import { firebaseApp } from "./firebaseClient";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

const auth = getAuth(firebaseApp);

export const listenToAuth = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const signInGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const logout = async () => {
  await signOut(auth);
};

export { auth };