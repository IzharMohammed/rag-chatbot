import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URL
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get session ID from cookies or create a new one
        const cookieStore = await cookies();
        let sessionId = cookieStore.get('sessionId')?.value;

        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2, 15);
        }
        console.log('Session ID:', sessionId);
        console.log('Tokens:', tokens);
        // Save tokens to database
        await prisma.userToken.upsert({
            where: { sessionId },
            update: {
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token, // Only updates if new one provided
                expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
            },
            create: {
                sessionId,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
            },
        });

        // Set cookie and redirect
        const response = NextResponse.redirect(new URL('/?connected=true', req.url));
        response.cookies.set('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        });

        return response;
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        return NextResponse.json({ error: 'Failed to exchange code' }, { status: 500 });
    }
}
