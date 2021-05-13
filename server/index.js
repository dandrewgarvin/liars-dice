const express = require('express');
const cors = require('cors');
const socketIO = require('socket.io');

// ========== CUSTOM UTILS ========== //
const generate_id = require('./utils/generate_id');
const roll_dice = require('./utils/roll_dice');

const app = express();

app.use(cors());

const port = process.env.PORT || 3005;
const io = socketIO(
  app.listen(port, () => console.log(`listening on port ${port}`))
);

const GAME_STATUSES = {
  waiting: 'Waiting for players',
  ready: 'Ready to start',
  ongoing: 'Game has started',
  ended: 'Game over',
};

let active_games = [];

io.on('connection', socket => {
  console.log(
    `Socket ${socket.id} has connected from address ${socket.handshake.address}.`
  );

  socket.on('create game', async input => {
    if (!input) {
      input.game_rules = {};
    }

    const {
      player_name = 'Player 1',
      game_rules: {
        starting_dice_count = 5,
        spot_on = true,
        spot_on_everyone = true,
        spot_on_everyone_minimum = 10,
        highest_value = 6,
      },
    } = input;

    const new_game = {
      room_id: generate_id(),
      host_id: socket.id,
      game_status: GAME_STATUSES.waiting,
      current_player_turn: null, // will become players[index] integer once game starts
      current_bet: {
        bluff: false,
        spot_on: false,
        face: null,
        value: null,
      },
      players: [
        {
          id: socket.id,
          name: player_name,
          dice: roll_dice({ roll_count: starting_dice_count, highest_value }),
          is_host: true,
        },
      ],
      rules: {
        starting_dice_count,
        spot_on,
        spot_on_everyone,
        spot_on_everyone_minimum,
        highest_value,
      },
    };

    active_games.push(new_game);

    socket.join(new_game.room_id);
    socket.emit('created game', new_game);
  });

  socket.on('join game', async input => {
    const { player_name = 'Player', room_id } = input;

    if (!room_id) {
      return socket.emit('error', {
        message: 'Unable to join empty room',
      });
    }

    const current_game = active_games.find(game => game.room_id === room_id);

    if (!current_game) {
      return socket.emit('error', {
        message: 'Invalid room code',
      });
    }

    current_game.status = GAME_STATUSES.ready;
    current_game.players.push({
      id: socket.id,
      name: player_name,
      dice: roll_dice({
        roll_count: current_game.rules.starting_dice_count,
        highest_value: current_game.rules.highest_value,
      }),
      is_host: false,
    });

    socket.join(current_game.room_id);
    socket.emit('joined game', current_game);
    socket.to(current_game.room_id).emit('player joined room', current_game);
  });

  socket.on('leave game', async input => {
    const { room_id } = input;

    if (!room_id) {
      return socket.emit('left room', {
        message: 'Successfully left room',
      });
    }

    const current_game = active_games.find(game => game.room_id === room_id);

    if (!current_game) {
      return socket.emit('left room', {
        message: 'Successfully left room',
      });
    }

    current_game.players = current_game.players.filter(
      player => player.id !== socket.id
    );

    if (!current_game.players.length) {
      active_games = active_games.filter(
        game => game.room_id === current_game.room_id
      );
    } else if (current_game.players.length <= 1) {
      current_game.status = GAME_STATUSES.waiting;
    }

    socket.emit('left room', {
      message: 'Successfully left room',
    });
    socket.leave(room_id);
    socket.to(current_game.room_id).emit('player left room', current_game);
  });

  socket.on('start game', async () => {
    const current_game = active_games.find(game => game.host_id === socket.id);

    if (!current_game || current_game.host_id !== socket.id) {
      return socket.emit('error', {
        message: 'Current player is not the host of a game',
      });
    }

    if (current_game.status === GAME_STATUSES.waiting) {
      return socket.emit('error', {
        message: 'Must have more players before the game can be started',
      });
    } else if (
      current_game.status === GAME_STATUSES.ongoing ||
      current_game.status === GAME_STATUSES.ended
    ) {
      return socket.emit('error', {
        message: 'The game has already started',
      });
    }

    current_game.status = GAME_STATUSES.ongoing;
    current_game.current_player_turn = Math.floor(
      Math.random() * current_game.players.length - 1
    );

    io.in(current_game.room_id).emit('next player turn', current_game);
  });

  socket.on('player bet', async input => {
    const { current_bet } = input;

    const current_game = active_games.find(
      game => !!game.players.find(player => player.id === socket.id)
    );
    const current_player = active_games.find(player => player.id === socket.id);

    if (!current_game || current_game.status !== GAME_STATUSES.ongoing) {
      return socket.emit('error', {
        message: 'Unable to find active game',
      });
    }

    // so much looping :sob:
    if (
      current_game.current_player_turn !==
      current_game.players.findIndex(player => player.id === current_player.id)
    ) {
      return socket.emit('error', {
        message: 'Illegal move. Out of turn',
      });
    }

    // ===== handle logic for the players bet ===== //

    // player increases bet
      // check for illegal bet (too low, too high)
      // set next player turn

    // player calls bluff
      // count dice totals
      // remove die if needed
      // reroll all dice

    // player calls spot on
      // check game rules for illegal move
      if (!current_game.rules.spot_on && current_bet.spot_on) {
        return socket.emit('error', {
          message: 'Illegal move. "Spot On" has been disabled',
        });
      }

      // count dice totals
      // if above minimum dice, remove multiple
      // if at or below minimum dice, remove single
      // reroll all dice

    // ===== check for game end ===== //

    // ===== emit results to all players ===== //
  });

  // handle disconnect

  // handle reconnect

  // handle restart game
});
