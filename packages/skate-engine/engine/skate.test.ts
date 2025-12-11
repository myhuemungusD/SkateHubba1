import { describe, it, expect } from 'vitest';
import { createGame, submitTurn, nextTurn, getLetterForBail, calculateWinner } from './skate';
import { Game } from '../../types/skate';

describe('Skate Engine', () => {
  describe('createGame', () => {
    it('should initialize a game with correct player states', () => {
      const game = createGame('game-123', 'player-A', 'player-B');

      expect(game.id).toBe('game-123');
      expect(game.playerA).toBe('player-A');
      expect(game.playerB).toBe('player-B');
      expect(game.status).toBe('pending');
      expect(game.currentTurn).toBe('A');
      expect(game.turns).toEqual([]);
      expect(game.createdAt).toBeDefined();
      expect(game.updatedAt).toBeDefined();
    });
  });

  describe('submitTurn', () => {
    it('should create a turn object with pending result', () => {
      const turnData = {
        id: 'turn-1',
        gameId: 'game-123',
        playerId: 'player-A',
        videoUrl: 'http://example.com/video.mp4',
        trickName: 'Kickflip',
      };

      const turn = submitTurn(turnData);

      expect(turn.id).toBe(turnData.id);
      expect(turn.gameId).toBe(turnData.gameId);
      expect(turn.playerId).toBe(turnData.playerId);
      expect(turn.videoUrl).toBe(turnData.videoUrl);
      expect(turn.trickName).toBe(turnData.trickName);
      expect(turn.result).toBe('pending');
      expect(turn.letter).toBe('');
      expect(turn.createdAt).toBeDefined();
    });
  });

  describe('nextTurn', () => {
    it('should switch turn from A to B', () => {
      expect(nextTurn('A')).toBe('B');
    });

    it('should switch turn from B to A', () => {
      expect(nextTurn('B')).toBe('A');
    });
  });

  describe('getLetterForBail', () => {
    it('should return S for 1 bail', () => {
      expect(getLetterForBail(1)).toBe('S');
    });

    it('should return K for 2 bails', () => {
      expect(getLetterForBail(2)).toBe('K');
    });

    it('should return A for 3 bails', () => {
      expect(getLetterForBail(3)).toBe('A');
    });

    it('should return T for 4 bails', () => {
      expect(getLetterForBail(4)).toBe('T');
    });

    it('should return E for 5 bails', () => {
      expect(getLetterForBail(5)).toBe('E');
    });

    it('should clamp to S for < 1 bail', () => {
      expect(getLetterForBail(0)).toBe('S');
    });

    it('should clamp to E for > 5 bails', () => {
      expect(getLetterForBail(6)).toBe('E');
    });
  });

  describe('calculateWinner', () => {
    const mockGame: Game = {
      id: 'game-1',
      playerA: 'uid-A',
      playerB: 'uid-B',
      status: 'in_progress',
      currentTurn: 'A',
      turns: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('should return playerB as winner if playerA has 5 letters', () => {
      const winner = calculateWinner(mockGame, 5, 0);
      expect(winner).toBe('uid-B');
    });

    it('should return playerA as winner if playerB has 5 letters', () => {
      const winner = calculateWinner(mockGame, 0, 5);
      expect(winner).toBe('uid-A');
    });

    it('should return undefined if neither player has 5 letters', () => {
      const winner = calculateWinner(mockGame, 4, 4);
      expect(winner).toBeUndefined();
    });
  });
});
