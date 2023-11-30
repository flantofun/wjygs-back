function isActivate(proportion = 0) {
  const num = randomNum(1, 10001);
  return num > proportion;
}

function randomNum(m, n) {
  var num = Math.floor(Math.random() * (m - n) + n);
  return num;
}

module.exports = {
  isActivate,
};
