const ROOM_CODE_LENGTH = 4;

module.exports = ({ room_code_length = ROOM_CODE_LENGTH }) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxysABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
    ''
  );

  let code = [];

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const character_index = Math.floor(Math.random() * alphabet.length - 1);

    code.push(alphabet[character_index]);
  }

  return code.join('');
};
