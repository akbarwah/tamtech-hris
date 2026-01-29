// Fungsi murni untuk menghitung rata-rata skor per departemen
export const calculateDeptAverage = (reviews: any[]) => {
  const deptScores: { [key: string]: { total: number, count: number } } = {};

  reviews.forEach((review) => {
    // Ambil nama departemen, jika tidak ada set 'Unassigned'
    const dept = review.employees?.department || 'Unassigned';
    // Ambil nilai akhir, pastikan tipe number
    const score = Number(review.final_score) || 0;

    if (!deptScores[dept]) {
      deptScores[dept] = { total: 0, count: 0 };
    }
    deptScores[dept].total += score;
    deptScores[dept].count += 1;
  });

  // Return format array bersih: [{ department: 'IT', avg_score: '85.5' }, ...]
  return Object.keys(deptScores).map(dept => ({
    department: dept,
    avg_score: (deptScores[dept].total / deptScores[dept].count).toFixed(1)
  }));
};