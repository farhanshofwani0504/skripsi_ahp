const { exec } = require('child_process');

async function run() {
  console.log('\n⏳ Menjalankan semua seed...');
  await import('./seedKriteria.js');
  await import('./seedKaryawan.js');
  await import('./seedPenilaian.js');
  await import('./seedBobotKriteria.js');
  await import('./seedPenilaian.js')

}

run();
