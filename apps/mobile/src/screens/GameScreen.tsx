/// GOAL:
/// Build the main Game View screen for SkateHubba mobile.
/// Displays letters, last trick video, and the active turn.
/// Allows the current user to submit a new turn.
///
/// LOCATION:
/// apps/mobile/src/screens/GameScreen.tsx
///
/// REQUIREMENTS:
/// - use React Native components (View, Text, ScrollView, TouchableOpacity)
/// - use Expo AV's Video component for playback
///     import { Video } from "expo-av";
/// - Load game by gameId passed via navigation params
/// - Subscribe to Firestore:
///       onSnapshot(doc(firestore, "games", gameId))
///       onSnapshot(query(turns), orderBy createdAt desc) for last trick
///
/// DISPLAY:
/// - Player A letters
/// - Player B letters
/// - Turn status:
///       "Your turn" (highlight orange)
///       "Waiting..." (dim)
/// - Last trick video (if exists)
///
/// ACTION:
/// - If it's the user's turn:
///       Show button: "Submit Attempt"
///       navigation.navigate("SubmitScreen", { gameId })
///
/// THEME:
/// - Black background
/// - Neon green headings
/// - Orange call-to-action button
///
/// IMPORTS:
/// import { useEffect, useState } from "react";
/// import { View, Text, TouchableOpacity } from "react-native";
/// import { Video, ResizeMode } from "expo-av";
/// import { auth, firestore } from "@utils/firebaseClient";
/// import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
/// import type { Game, Turn } from "@skatehubba/types";
/// import { useRoute, useNavigation } from "@react-navigation/native";
///
/// RULES:
/// - No placeholder logic
/// - Must handle loading and missing game cleanly
/// - Must handle no-turns-yet safely
///
/// OUTPUT:
/// Fully functional GameScreen component.

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { auth, firestore } from "@utils/firebaseClient";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import type { Game, Turn } from "@skatehubba/types";
import { useRoute, useNavigation } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";

export default function GameScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { gameId } = route.params;

  const [game, setGame] = useState<Game | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Game Subscription
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(firestore, "games", gameId);
    const unsubscribeGame = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        setGame(docSnap.data() as Game);
      } else {
        setGame(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching game:", error);
      setLoading(false);
    });

    return () => unsubscribeGame();
  }, [gameId]);

  // Turns Subscription
  useEffect(() => {
    if (!gameId) return;

    const turnsRef = collection(firestore, "turns");
    const q = query(turnsRef, where("gameId", "==", gameId), orderBy("createdAt", "asc"));

    const unsubscribeTurns = onSnapshot(q, (querySnap) => {
      const turnsData: Turn[] = [];
      querySnap.forEach((doc) => {
        turnsData.push(doc.data() as Turn);
      });
      setTurns(turnsData);
    }, (error) => {
      console.error("Error fetching turns:", error);
    });

    return () => unsubscribeTurns();
  }, [gameId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found.</Text>
      </View>
    );
  }

  // Calculate Letters
  const getLetters = (playerId: string) => {
    return turns
      .filter((t) => t.playerId === playerId && t.letter)
      .map((t) => t.letter)
      .join("");
  };

  const lettersA = getLetters(game.playerA);
  const lettersB = getLetters(game.playerB);

  // Determine Turn Status
  const isMyTurn = currentUser && (
    (game.currentTurn === "A" && currentUser.uid === game.playerA) ||
    (game.currentTurn === "B" && currentUser.uid === game.playerB)
  );

  // Find Last Video
  const lastVideoTurn = [...turns].reverse().find((t) => t.videoUrl);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        <View style={styles.playerScore}>
          <Text style={styles.playerLabel}>PLAYER A</Text>
          <Text style={styles.letters}>{lettersA || "SKATE"}</Text>
          {currentUser?.uid === game.playerA && <Text style={styles.youLabel}>(YOU)</Text>}
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
          <View style={[styles.statusBadge, isMyTurn ? styles.statusActive : styles.statusWaiting]}>
            <Text style={styles.statusText}>
              {game.status === "finished" ? "DONE" : isMyTurn ? "YOUR TURN" : "WAITING"}
            </Text>
          </View>
        </View>

        <View style={styles.playerScore}>
          <Text style={styles.playerLabel}>PLAYER B</Text>
          <Text style={styles.letters}>{lettersB || "SKATE"}</Text>
          {currentUser?.uid === game.playerB && <Text style={styles.youLabel}>(YOU)</Text>}
        </View>
      </View>

      {/* Video Section */}
      <View style={styles.videoSection}>
        {lastVideoTurn ? (
          <View style={styles.videoContainer}>
            <View style={styles.videoHeader}>
              <Text style={styles.trickName}>{lastVideoTurn.trickName}</Text>
              <Text style={styles.trickDate}>{new Date(lastVideoTurn.createdAt).toLocaleDateString()}</Text>
            </View>
            <Video
              source={{ uri: lastVideoTurn.videoUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              useNativeControls
              style={styles.video}
            />
          </View>
        ) : (
          <View style={styles.emptyVideo}>
            <Text style={styles.emptyVideoText}>No tricks yet. Start the game!</Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      {game.status !== "finished" && isMyTurn && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("SubmitScreen", { gameId })}
        >
          <Text style={styles.actionButtonText}>SUBMIT ATTEMPT</Text>
        </TouchableOpacity>
      )}

      {game.status === "finished" && (
        <View style={styles.finishedContainer}>
          <Text style={styles.winnerText}>
            WINNER: {game.winnerId === currentUser?.uid ? "YOU!" : "OPPONENT"}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("HomeScreen")}>
            <Text style={styles.backLink}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 18,
    marginTop: 50,
    textAlign: "center",
  },
  scoreboard: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 20,
  },
  playerScore: {
    alignItems: "center",
    flex: 1,
  },
  playerLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  letters: {
    color: "#39FF14",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  youLabel: {
    color: "#444",
    fontSize: 10,
    marginTop: 2,
  },
  vsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  vsText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: "#39FF14",
  },
  statusWaiting: {
    backgroundColor: "#333",
  },
  statusText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
  },
  videoSection: {
    width: "100%",
    marginBottom: 30,
  },
  videoContainer: {
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
  },
  videoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  trickName: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  trickDate: {
    color: "#666",
    fontSize: 12,
  },
  video: {
    width: "100%",
    height: 250,
    backgroundColor: "#000",
  },
  emptyVideo: {
    width: "100%",
    height: 200,
    backgroundColor: "#111",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#222",
    borderStyle: "dashed",
  },
  emptyVideoText: {
    color: "#666",
  },
  actionButton: {
    backgroundColor: "#FF5F1F",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#FF5F1F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  finishedContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  winnerText: {
    color: "#39FF14",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  backLink: {
    color: "#888",
    textDecorationLine: "underline",
  },
});
