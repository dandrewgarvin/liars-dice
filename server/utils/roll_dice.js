module.exports = ({ roll_count, highest_value }) => {
  const dice = [];

  for (let i = 0; i < roll_count; i++) {
    const roll = Math.floor(Math.random() * highest_value - 1);

    dice.push(roll);
  }

  return dice;
};
