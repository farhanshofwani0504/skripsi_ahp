// utils/ahp.js
exports.calcCR = (matrix) => {
  const n = matrix.length;
  // 1. eigen vector approx (average normalised columns)
  const colSum = Array(n).fill(0);
  matrix.forEach((row) => row.forEach((v, i) => (colSum[i] += v)));
  const weights = matrix.map(
    (row) => row.reduce((acc, v, i) => acc + v / colSum[i], 0) / n
  );

  // 2. λ_max
  const lambdaMax = weights.reduce((acc, w, i) => acc + colSum[i] * w, 0);

  // 3. CI & CR
  const CI = (lambdaMax - n) / (n - 1);
  const RI = [0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41][n] || 1.59; // up to 10
  const CR = CI / RI;
  return { weights, lambdaMax, CI, CR };
};
