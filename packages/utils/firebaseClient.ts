import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@env/firebase";

export const firebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
