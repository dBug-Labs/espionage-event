import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.ADMIN_PASSWORD}`;
  return auth === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const teams = await Team.find().sort({ createdAt: 1 }).lean();

    const rows: string[] = [
      'Team ID,Team Name,Leader Name,Leader Email,Leader College Email,Leader Reg No,Leader Phone,Member 1 Name,Member 1 Email,Member 1 College Email,Member 1 Reg No,Member 2 Name,Member 2 Email,Member 2 College Email,Member 2 Reg No,Team Size,Amount Paid,Payment ID,Payment Status,Attendance,Checked In At,Registered At',
    ];

    for (const t of teams) {
      const m1 = t.members[0];
      const m2 = t.members[1];
      rows.push(
        [
          t.teamId,
          `"${t.teamName}"`,
          `"${t.teamLeader.name}"`,
          t.teamLeader.email,
          t.teamLeader.collegeEmail || '',
          t.teamLeader.regNo || '',
          t.teamLeader.phone,
          m1 ? `"${m1.name}"` : '',
          m1 ? m1.email : '',
          m1 ? (m1.collegeEmail || '') : '',
          m1 ? (m1.regNo || '') : '',
          m2 ? `"${m2.name}"` : '',
          m2 ? m2.email : '',
          m2 ? (m2.collegeEmail || '') : '',
          m2 ? (m2.regNo || '') : '',
          t.teamSize,
          t.amountPaid,
          t.paymentId,
          t.paymentStatus,
          t.attendance?.present ? 'Present' : 'Absent',
          t.attendance?.checkedAt ? `"${new Date(t.attendance.checkedAt).toLocaleString('en-IN')}"` : 'N/A',
          `"${new Date(t.createdAt).toLocaleString('en-IN')}"`,
        ].join(',')
      );
    }

    const csvContent = rows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="housie-teams-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('[admin/export]', err);
    return NextResponse.json({ error: 'Failed to export.' }, { status: 500 });
  }
}
