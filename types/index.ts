export interface Employee {
  id: number;
  full_name: string;
  email: string;
  job_position: string;
  // ...
}

export interface Asset {
  id: number;
  name: string;
  status: 'Good' | 'Repair' | 'Broken';
  holder?: string; // Tanda tanya artinya boleh kosong
}