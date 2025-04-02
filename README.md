# LOUDD - Your Music Platform

Welcome to **LOUDD**, a music dashboard app built for fans, artists, and admins. Whether you're here to listen, create, or manage, LOUDD’s got you covered with a sleek, dark-themed interface and dope features.

## Features

- **Fans**:
  - Stream recommended tracks and add them to your favorites.
  - Track your listening stats and history with cool charts.
  - Check out recently played songs.

- **Artists**:
  - Upload tracks for review and manage your music (update or delete).
  - See your total streams and songs, plus a performance chart.
  - View active contracts.

- **Admins**:
  - Monitor platform stats (artists, tracks, pending reviews).
  - Approve or manage artist-uploaded tracks.
  - Delete artists and see platform-wide analytics.

- **General**:
  - Login/register access depending on your role(fan, artist, admin).
  - Profile initals based on your username.
  - Built with HTML, CSS, JavaScript, ApexCharts, and Lucide icons.

## Prerequisites

- A backend server running at `http://127.0.0.1:5000` (e.g., Flask or similar) with endpoints for:
  - User auth (`/login`, `/register`, `/logout`, `/user`).
  - Fan features (`/fan/stats`, `/fan/listening_history`, `/fan/recently_played`, `/fan/recommended`, `/fan/favorites`).
  - Artist features (`/artist/stats`, `/streams`, `/uploads`, `/contracts`).
  - Admin features (`/admin/stats`, `/admin/platform_analytics`, `/admin/pending_reviews`, `/admin/artists`).
- A modern browser (Chrome, Firefox, etc.).

## Installation

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/your-username/loudd.git
   cd loudd