import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Team from '@/models/Team';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const authHeader = request.headers.get('authorization');

        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!mongoose.connections[0].readyState) {
            await mongoose.connect(process.env.MONGODB_URI as string);
        }

        let query: any = {};
        if (type === 'participant') {
            query = { 'attendance.present': true };
        } else if (type === 'winner') {
            query = { isWinner: true };
        } else {
            return new NextResponse('Invalid certificate type', { status: 400 });
        }

        const eligibleTeams = await Team.find(query);
        if (!eligibleTeams || eligibleTeams.length === 0) {
            return new NextResponse('No eligible teams found', { status: 404 });
        }

        // Load template
        const templatePath = path.join(process.cwd(), 'public', 'certificate_template.pdf');
        if (!fs.existsSync(templatePath)) {
            return new NextResponse('Template not found', { status: 500 });
        }
        const templateBytes = fs.readFileSync(templatePath);

        const zip = new JSZip();
        const eventName = 'Housie of Fame';
        const eventDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        for (const team of eligibleTeams) {
            const allMembers = [team.teamLeader, ...team.members];

            for (const member of allMembers) {
                if (!member.name) continue;

                const pdfDoc = await PDFDocument.load(templateBytes);
                const pages = pdfDoc.getPages();
                const firstPage = pages[0];

                const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

                // Name
                firstPage.drawText(member.name, {
                    x: 421 - (member.name.length * 8.5), // rough centering
                    y: 290,
                    size: 32,
                    font: boldFont,
                    color: rgb(0.8, 0.6, 0.2), // Gold color
                });

                // Team info
                firstPage.drawText(`from team ${team.teamName}`, {
                    x: 421 - (`from team ${team.teamName}`.length * 4.5),
                    y: 260,
                    size: 16,
                    font: normalFont,
                });

                // Event info
                firstPage.drawText(eventName, {
                    x: 421 - (eventName.length * 8),
                    y: 180,
                    size: 30,
                    font: boldFont,
                });

                // Date
                firstPage.drawText(`Date: ${eventDate}`, {
                    x: 350,
                    y: 120,
                    size: 16,
                    font: normalFont,
                });

                // Winner title
                if (type === 'winner' && team.winnerTitle) {
                    firstPage.drawText(team.winnerTitle.toUpperCase(), {
                        x: 421 - (team.winnerTitle.length * 6),
                        y: 400,
                        size: 24,
                        font: boldFont,
                        color: rgb(0.8, 0.2, 0.2), // Reddish for winners
                    });
                } else if (type === 'participant') {
                    firstPage.drawText('PARTICIPANT', {
                        x: 350,
                        y: 400,
                        size: 20,
                        font: boldFont,
                        color: rgb(0.3, 0.3, 0.3),
                    });
                }

                const pdfBytesData = await pdfDoc.save();

                const safeName = member.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const safeTeam = team.teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `${type}_${safeTeam}_${safeName}.pdf`;

                zip.file(fileName, pdfBytesData);
            }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        const response = new NextResponse(zipBuffer as any);
        response.headers.set('Content-Type', 'application/zip');
        response.headers.set('Content-Disposition', `attachment; filename="${type}_certificates.zip"`);
        return response;

    } catch (error) {
        console.error(`Error generating ${request.url} certificates:`, error);
        return new NextResponse('Failed to generate certificates', { status: 500 });
    }
}
