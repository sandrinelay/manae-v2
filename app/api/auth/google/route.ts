import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { code, redirect_uri } = await request.json()

        if (!code) {
            return NextResponse.json(
                { error: 'Authorization code is required' },
                { status: 400 }
            )
        }

        // Client secret is now safely on the server
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        // Support both env var names for backwards compatibility
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET

        if (!clientId || !clientSecret) {
            console.error('Google OAuth credentials not configured')
            return NextResponse.json(
                { error: 'OAuth not configured' },
                { status: 500 }
            )
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri,
                grant_type: 'authorization_code'
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Google token exchange error:', errorData)
            return NextResponse.json(
                { error: 'Failed to exchange code for token' },
                { status: response.status }
            )
        }

        const tokens = await response.json()
        return NextResponse.json(tokens)

    } catch (error) {
        console.error('Google auth error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
