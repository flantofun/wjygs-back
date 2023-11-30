function random(min, max) {
  if (min === undefined) {
    return Math.random();
  }

  if (max === undefined) {
    max = min;
    min = 0;
  }

  if (max < min) {
    var tmp = max;
    max = min;
    min = tmp;
  }

  return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = {
  random,
};
