const RI_TABLE = [0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45];

exports.calcCR = (matrix) => {
  const n = matrix.length;

  // 1. eigenvector approx (average normalised columns)
  const colSum = Array(n).fill(0);
  matrix.forEach((row) => row.forEach((v, i) => (colSum[i] += v)));
  const weights = matrix.map(
    (row) => row.reduce((acc, v, i) => acc + v / colSum[i], 0) / n
  );

  // 2. λ_max
  const lambdaMax = weights.reduce((acc, w, i) => acc + colSum[i] * w, 0);

  // 3. CI & CR
  const CI = (lambdaMax - n) / (n - 1);
  const RI = RI_TABLE[n] ?? 1.59; // kalau n > 9 ambil 1.59
  const CR = parseFloat((CI / RI).toFixed(4));

  return { weights, lambdaMax, CI, CR };
};
