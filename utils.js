function formatTimestamp(timestamp) {
  const pad = v => `0${v}`.slice(-2);
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth())}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = {
  formatTimestamp,
};
