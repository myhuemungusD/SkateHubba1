/// GOAL:
/// Build the turn submission screen for SkateHubba on Expo.
/// User records a trick attempt, compresses video, uploads it,
/// creates a Turn document, and returns to GameScreen.
///
/// LOCATION:
/// apps/mobile/src/screens/SubmitScreen.tsx
///
/// TECH:
/// - react-native-vision-camera for recording
/// - ffmpeg-kit-react-native for compression
/// - Firebase Storage for upload
/// - Firestore for the Turn doc
///
/// REQUIREMENTS:
/// - Request camera + microphone permissions
/// - Use VisionCamera to record up to 15 seconds
/// - After recording:
///       compress file with FFmpeg (CRF ~28, mp4)
///       upload to Firebase Storage under:
///           skateTurns/{gameId}/{uuid}.mp4
///       generate public download URL
/// - Create Turn document:
///       id (uuid)
///       gameId
///       playerId (auth.uid)
///       videoUrl
///       trickName (simple input box)
///       result: "pending"
///       letter: ""
///       createdAt: Date.now()
/// - Navigate back to GameScreen
///
/// UI FLOW:
/// 1. If no permission → request
/// 2. Show live camera preview
/// 3. Record button (orange)
/// 4. After recording → show video preview + "Submit" button
///
/// THEME:
/// - Black background
/// - Neon green labels
/// - Orange record/submit buttons
///
/// IMPORTS:
/// import { useState, useEffect, useRef } from "react";
/// import { View, Text, TouchableOpacity, TextInput } from "react-native";
/// import { Camera, useCameraPermission, useMicrophonePermission } from "react-native-vision-camera";
/// import { FFmpegKit } from "ffmpeg-kit-react-native";
/// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
/// import { doc, setDoc } from "firebase/firestore";
/// import { firestore, storage, auth } from "@utils/firebaseClient";
/// import { useNavigation, useRoute } from "@react-navigation/native";
/// import { v4 as uuid } from "uuid";
///
/// RULES:
/// - Do NOT include placeholder code
/// - Must handle permissions cleanly
/// - Must handle loading + errors
/// - 100% TypeScript
///
/// OUTPUT:
/// A fully functional SubmitScreen component.

import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, VideoFile } from "react-native-vision-camera";
import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { firestore, storage, auth } from "@utils/firebaseClient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { v4 as uuidv4 } from "uuid";
import { Video, ResizeMode } from "expo-av";

export default function SubmitScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { gameId } = route.params;

  const device = useCameraDevice('back');
  const { hasPermission: hasCamPermission, requestPermission: requestCamPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();

  const camera = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [trickName, setTrickName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (!hasCamPermission) requestCamPermission();
    if (!hasMicPermission) requestMicPermission();
  }, []);

  const startRecording = async () => {
    if (!camera.current) return;
    setIsRecording(true);
    try {
      camera.current.startRecording({
        onRecordingFinished: (video) => {
          setVideoFile(video);
          setIsRecording(false);
        },
        onRecordingError: (error) => {
          console.error("Recording error:", error);
          setIsRecording(false);
          Alert.alert("Error", "Failed to record video.");
        },
      });
    } catch (e) {
      console.error("Start recording failed:", e);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!camera.current) return;
    await camera.current.stopRecording();
  };

  const compressVideo = async (sourcePath: string): Promise<string | null> => {
    setCompressing(true);
    const outputPath = `${sourcePath.replace(".mp4", "")}_compressed.mp4`;
    // FFmpeg command: -i input -vcodec libx264 -crf 28 -preset ultrafast output
    const command = `-i ${sourcePath} -vcodec libx264 -crf 28 -preset ultrafast ${outputPath}`;

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    setCompressing(false);
    if (ReturnCode.isSuccess(returnCode)) {
      return outputPath;
    } else {
      console.error("FFmpeg compression failed");
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!videoFile || !trickName.trim()) {
      Alert.alert("Missing Info", "Please record a video and enter a trick name.");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    setUploading(true);

    try {
      // 1. Compress
      const compressedPath = await compressVideo(videoFile.path);
      const finalPath = compressedPath || videoFile.path; // Fallback to original if compression fails

      // 2. Read file and upload
      // Note: React Native fetch supports file:// URIs for Blob creation in some versions,
      // or use XMLHttpRequest. For simplicity with Firebase JS SDK in RN:
      const response = await fetch(`file://${finalPath}`);
      const blob = await response.blob();

      const turnId = uuidv4();
      const storagePath = `skateTurns/${gameId}/${turnId}.mp4`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // 3. Create Turn Doc
      const turnData = {
        id: turnId,
        gameId: gameId,
        playerId: auth.currentUser.uid,
        videoUrl: downloadURL,
        trickName: trickName.trim(),
        result: "pending",
        letter: "",
        createdAt: Date.now(),
      };

      await setDoc(doc(firestore, "turns", turnId), turnData);

      setUploading(false);
      navigation.goBack();
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
      Alert.alert("Error", "Failed to upload turn. Please try again.");
    }
  };

  if (!hasCamPermission || !hasMicPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!videoFile ? (
        // Camera View
        <View style={styles.cameraContainer}>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            video={true}
            audio={true}
          />
          <View style={styles.overlay}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recording]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <View style={styles.recordInner} />
            </TouchableOpacity>
            <Text style={styles.instructionText}>
              {isRecording ? "Recording..." : "Tap to Record"}
            </Text>
          </View>
        </View>
      ) : (
        // Preview & Submit View
        <View style={styles.previewContainer}>
          <Text style={styles.header}>PREVIEW ATTEMPT</Text>
          
          <Video
            source={{ uri: videoFile.path }}
            style={styles.videoPreview}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
          />

          <View style={styles.formContainer}>
            <Text style={styles.label}>TRICK NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kickflip"
              placeholderTextColor="#666"
              value={trickName}
              onChangeText={setTrickName}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={uploading || compressing}
            >
              {uploading || compressing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>SUBMIT TURN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                setVideoFile(null);
                setTrickName("");
              }}
              disabled={uploading}
            >
              <Text style={styles.retakeText}>Retake Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  text: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 50,
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  recording: {
    borderColor: "#FF5F1F",
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF5F1F",
  },
  instructionText: {
    color: "#FFF",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  previewContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  header: {
    color: "#39FF14",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 40,
  },
  videoPreview: {
    width: "100%",
    height: 300,
    backgroundColor: "#111",
    borderRadius: 12,
    marginBottom: 20,
  },
  formContainer: {
    width: "100%",
  },
  label: {
    color: "#39FF14",
    fontWeight: "bold",
    marginBottom: 8,
    fontSize: 12,
  },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 15,
    color: "#FFF",
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#FF5F1F",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  retakeButton: {
    alignItems: "center",
    padding: 10,
  },
  retakeText: {
    color: "#888",
    textDecorationLine: "underline",
  },
});
