import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { auth, firestore } from "@utils/firebaseClient";
import { collection, query, where, onSnapshot, or } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import type { Game } from "@skatehubba/types";
import { onAuthStateChanged, User } from "firebase/auth";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [games, setGames] = useState<Game[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const gamesRef = collection(firestore, "games");
    
    // Query for games where user is playerA OR playerB
    const q = query(
      gamesRef, 
      or(
        where("playerA", "==", currentUser.uid),
        where("playerB", "==", currentUser.uid)
      )
    );

    const unsubscribeGames = onSnapshot(q, (snapshot) => {
      const gamesData: Game[] = [];
      snapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      // Sort by updatedAt desc locally
      gamesData.sort((a, b) => b.updatedAt - a.updatedAt);
      setGames(gamesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching games:", error);
      setLoading(false);
    });

    return () => unsubscribeGames();
  }, [currentUser]);

  const handleGamePress = (gameId: string) => {
    navigation.navigate("Game", { gameId });
  };

  const getOpponentId = (game: Game) => {
    if (!currentUser) return "";
    return game.playerA === currentUser.uid ? game.playerB : game.playerA;
  };

  const isMyTurn = (game: Game) => {
    if (!currentUser) return false;
    return (
      (game.currentTurn === "A" && currentUser.uid === game.playerA) ||
      (game.currentTurn === "B" && currentUser.uid === game.playerB)
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SKATEHUBBA</Text>
        {currentUser && <Text style={styles.userHandle}>{currentUser.email || 'User'}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>YOUR GAMES</Text>
        
        {!currentUser ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Please sign in to view your games.</Text>
          </View>
        ) : games.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active games found.</Text>
            {/* Placeholder for create game button */}
            <TouchableOpacity 
              style={styles.createButton}
              // onPress={() => navigation.navigate("CreateGame")}
            >
              <Text style={styles.createButtonText}>START NEW GAME</Text>
            </TouchableOpacity>
          </View>
        ) : (
          games.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleGamePress(game.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.opponentText}>VS {getOpponentId(game)}</Text>
                <View style={[
                  styles.statusBadge, 
                  isMyTurn(game) ? styles.statusActive : styles.statusWaiting
                ]}>
                  <Text style={[
                    styles.statusText,
                    isMyTurn(game) ? { color: '#000' } : { color: '#fff' }
                  ]}>
                    {game.status === "finished" 
                      ? "FINISHED" 
                      : isMyTurn(game) ? "YOUR TURN" : "THEIR TURN"}
                  </Text>
                </View>
              </View>
              
              <View style={styles.scoreContainer}>
                <Text style={styles.gameIdText}>Game ID: {game.id.substring(0, 8)}...</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#39FF14",
    letterSpacing: -1,
    fontFamily: 'monospace',
  },
  userHandle: {
    color: '#888',
    fontSize: 12,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emptyState: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#FF5F1F",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  gameCard: {
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  opponentText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#39FF14",
  },
  statusWaiting: {
    backgroundColor: "#333",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gameIdText: {
    color: "#444",
    fontSize: 12,
    fontFamily: "monospace",
  },
});

