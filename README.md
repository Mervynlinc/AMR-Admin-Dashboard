# AMR Dashboard

A Next.js admin dashboard for managing microbiology laboratory operations and tracking antimicrobial resistance (AMR) surveillance data.

## Features

- **Dashboard** - Real-time statistics on MRSA/MSSA prevalence, lab users, laboratories, and published reports
- **Lab Users Management** - Add, reset passwords, and delete lab technicians and staff
- **Labs Management** - Register, edit, and delete microbiology laboratories
- **Reports** - View and download AMR surveillance reports with detailed AST results

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS, TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Authentication:** Session-based with edge middleware protection
- **Password Security:** Server-side hashing with pgcrypto (Blowfish)
- **Icons:** Lucide React
- **PDF Generation:** jsPDF

## Database Tables

- `admin_users` - System administrators
- `lab_users` - Lab technicians and staff  
- `labs` - Microbiology laboratories
- `lab_reports` - AMR surveillance reports
- `isolates` - Microbiological isolates with MRSA/MDR status
- `samples` - Patient samples
- `susceptibility_tests` - AST results
- `antibiotics` - Antibiotic definitions

## Security

- All passwords hashed server-side using PostgreSQL pgcrypto (`gen_salt('bf')` + `crypt()`)
- Route protection via Next.js middleware
- Input validation on all forms

## Environment Variables

