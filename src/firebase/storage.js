import { getStorage } from "firebase/storage";
import app from "./firebase";

const storage = getStorage(app);

export { storage };


