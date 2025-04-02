
// Toggle between login and register forms
document.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.view-card').forEach(card => card.classList.remove('active'));
        button.classList.add('active');
        const target = button.getAttribute('data-target');
        document.getElementById(`${target}-card`).classList.add('active');
    });
});

// Initialize Lucide icons after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for Lucide...');
    if (typeof lucide !== 'undefined') {
        console.log('Lucide found, creating icons...');
        lucide.createIcons();
    } else {
        console.warn('Lucide library not loaded - check if script loaded from unpkg.com');
    }
});

// Chart options template
const chartOptions = {
    chart: { type: 'area', height: 300, toolbar: { show: false }, background: 'transparent' },
    colors: ['#6366f1'],
    xaxis: { labels: { style: { colors: '#9ca3af' } } },
    yaxis: { labels: { style: { colors: '#9ca3af' } } },
    grid: { borderColor: '#374151' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.7, opacityTo: 0.3 } },
    tooltip: { theme: 'dark' }
};

// Check authentication status for dashboard pages only
function checkAuth() {
    console.log('Checking auth...');
    fetch('http://127.0.0.1:5000/user', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('Auth response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Auth response data:', data);
        if (data.username) {
            // Update all username elements
            document.querySelectorAll('.username').forEach(element => {
                element.textContent = data.username;
            });
            // Set profile initial based on username
            const profileInitial = document.getElementById('profileInitial');
            if (profileInitial) {
                const initial = data.username.charAt(0).toUpperCase();
                profileInitial.textContent = initial;
                console.log('Profile initial set to:', initial);
            } else {
                console.warn('Profile initial element not found');
            }
            const currentPage = window.location.pathname.split('/').pop();
            const expectedPage = data.role === 'viewer' ? 'fan.html' : `${data.role}.html`;
            if (currentPage !== expectedPage) {
                console.log(`Redirecting from ${currentPage} to ${expectedPage}`);
                window.location.href = expectedPage;
            }
        } else {
            console.error('No username in response:', data);
            window.location.href = 'index.html';
        }
    })
    .catch(error => {
        console.error('Auth check failed:', error);
        window.location.href = 'index.html';
    });
}

// Only run auth check on dashboard pages
const currentPage = window.location.pathname.split('/').pop();
const dashboardPages = ['fan.html', 'artist.html', 'admin.html'];
if (dashboardPages.includes(currentPage)) {
    checkAuth();
}

// Login handling
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    console.log('Login attempt:', { username, password });
    fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Login response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Login response data:', data);
        if (data.message === 'Logged in') {
            console.log('Redirecting to:', `${data.user.role === 'viewer' ? 'fan' : data.user.role}.html`);
            window.location.href = `${data.user.role === 'viewer' ? 'fan' : data.user.role}.html`;
        } else {
            document.getElementById('login-message').textContent = data.message;
            console.log('Login failed with message:', data.message);
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        document.getElementById('login-message').textContent = 'Login failed. Check console for details.';
    });
});

// Registration handling
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    console.log('Register attempt:', { username, password, role });
    fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Register response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Register response data:', data);
        if (data.message === 'Registered and logged in') {
            console.log('Redirecting to:', `${data.user.role === 'viewer' ? 'fan' : data.user.role}.html`);
            window.location.href = `${data.user.role === 'viewer' ? 'fan' : data.user.role}.html`;
        } else {
            document.getElementById('register-message').textContent = data.message;
            console.log('Register failed with message:', data.message);
        }
    })
    .catch(error => {
        console.error('Register error:', error);
        document.getElementById('register-message').textContent = 'Registration failed. Check console for details.';
    });
});

// Logout handling
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    fetch('http://127.0.0.1:5000/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Logged out') {
            window.location.href = 'index.html';
        }
    })
    .catch(error => console.error('Logout error:', error));
});

// Fan Dashboard - Only load content if on fan.html
if (document.querySelector('#listeningChart')) {
    fetch('http://127.0.0.1:5000/fan/stats', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.stat-value')[0].textContent = data.listened_songs;
            document.querySelectorAll('.stat-value')[1].textContent = data.favorite_tracks.length;
            document.getElementById('favoriteTracksList').innerHTML = data.favorite_tracks.length ? 
                data.favorite_tracks.map(t => `
                    <div class="track-item">
                        <div class="track-info">
                            <h3 class="font-medium text-sm">${t.title}</h3>
                            <p class="text-xs text-gray-400">${new Date(t.upload_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-400">No favorite tracks yet.</p>';
        })
        .catch(error => console.error('Error fetching fan stats:', error));

    fetch('http://127.0.0.1:5000/fan/listening_history', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            new ApexCharts(document.querySelector('#listeningChart'), {
                ...chartOptions,
                series: [{ name: 'Streams', data: data.streams }],
                xaxis: { categories: data.days }
            }).render();
        })
        .catch(error => console.error('Error fetching listening history:', error));

    fetch('http://127.0.0.1:5000/fan/recently_played', { credentials: 'include' })
        .then(response => {
            console.log('Recently Played response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch recently played');
            return response.json();
        })
        .then(data => {
            console.log('Recently Played Data:', data);
            document.getElementById('recentlyPlayed').innerHTML = data.length ? data.map(t => `
                <div class="track-item" data-track-id="${t.id}">
                    <div class="track-info">
                        <h3 class="font-medium">${t.title}</h3>
                        <p class="text-sm text-gray-400">${new Date(t.upload_date).toLocaleDateString()} - ${t.username || 'Unknown Artist'}</p>
                    </div>
                </div>
            `).join('') : '<p class="text-gray-400">No recent plays yet.</p>';
        })
        .catch(error => {
            console.error('Error fetching recently played:', error);
            document.getElementById('recentlyPlayed').innerHTML = '<p class="text-gray-400">Error loading recent plays.</p>';
        });

    function loadRecommended() {
        fetch('http://127.0.0.1:5000/fan/recommended', { credentials: 'include' })
            .then(response => {
                console.log('Recommended response status:', response.status);
                if (!response.ok) throw new Error('Failed to fetch recommended');
                return response.json();
            })
            .then(data => {
                console.log('Recommended Data:', data);
                document.getElementById('recommended').innerHTML = data.length ? data.map((t, index) => `
                    <div class="track-item" data-track-id="${t.id}">
                        <div class="track-info">
                            <h3 class="font-medium">${t.title}</h3>
                            <p class="text-sm text-gray-400">${new Date(t.upload_date).toLocaleDateString()} - ${t.username || 'Unknown Artist'}</p>
                        </div>
                        <button type="button" class="play-btn" onclick="playTrack(event, ${t.id}, '${encodeURIComponent(t.file_path)}', 'recommended-audio-${index}')">Play</button>
                        <audio id="recommended-audio-${index}" class="audio-player" controls preload="none"></audio>
                    </div>
                `).join('') : '<p class="text-gray-400">No recommendations available.</p>';

                const select = document.getElementById('favoriteTrackId');
                select.innerHTML = '<option value="">Select a track</option>' + 
                    data.map(t => `<option value="${t.id}">${t.title} - ${t.username || 'Unknown Artist'}</option>`).join('');
            })
            .catch(error => {
                console.error('Error fetching recommended:', error);
                document.getElementById('recommended').innerHTML = '<p class="text-gray-400">Error loading recommendations.</p>';
            });
    }
    loadRecommended();

    document.getElementById('addFavoriteForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const trackId = document.getElementById('favoriteTrackId').value;
        if (!trackId) return;
        fetch('http://127.0.0.1:5000/fan/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ track_id: trackId }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(() => {
            alert('Track favorited');
            fetch('http://127.0.0.1:5000/fan/stats', { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    document.querySelectorAll('.stat-value')[1].textContent = data.favorite_tracks.length;
                    document.getElementById('favoriteTracksList').innerHTML = data.favorite_tracks.length ? 
                        data.favorite_tracks.map(t => `
                            <div class="track-item">
                                <div class="track-info">
                                    <h3 class="font-medium text-sm">${t.title}</h3>
                                    <p class="text-xs text-gray-400">${new Date(t.upload_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-400">No favorite tracks yet.</p>';
                });
        })
        .catch(error => console.error('Error favoriting track:', error));
    });
}

// Artist Dashboard - Only load content if on artist.html
if (document.querySelector('#performanceChart')) {
    fetch('http://127.0.0.1:5000/artist/stats', { credentials: 'include' })
        .then(response => {
            console.log('Artist stats response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch artist stats');
            return response.json();
        })
        .then(data => {
            console.log('Artist Stats Data:', data);
            document.querySelectorAll('.stat-value')[0].textContent = data.total_streams;
            document.querySelectorAll('.stat-value')[1].textContent = data.total_songs;
        })
        .catch(error => console.error('Error fetching artist stats:', error));

    fetch('http://127.0.0.1:5000/streams', { credentials: 'include' })
        .then(response => {
            console.log('Streams response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch streams');
            return response.json();
        })
        .then(data => {
            console.log('Streams Data:', data);
            new ApexCharts(document.querySelector('#performanceChart'), {
                ...chartOptions,
                series: [{ name: 'Streams', data: data.streams }],
                xaxis: { categories: data.days }
            }).render();
        })
        .catch(error => {
            console.error('Error fetching streams:', error);
            document.getElementById('performanceChart').innerHTML = '<p class="text-gray-400">Error loading chart.</p>';
        });

    function loadManageMusic() {
        fetch('http://127.0.0.1:5000/uploads', { credentials: 'include' })
            .then(response => {
                console.log('Uploads response status:', response.status);
                if (!response.ok) throw new Error('Failed to fetch uploads');
                return response.json();
            })
            .then(data => {
                console.log('Manage Music Data:', data);
                document.getElementById('manageMusic').innerHTML = data.length ? data.map(u => `
                    <div class="track-item" data-track-id="${u.id}">
                        <div class="track-info">
                            <h3 class="font-medium">${u.title}</h3>
                            <p class="text-sm text-gray-400">${u.username} - ${u.status}</p>
                        </div>
                        <div>
                            <button class="action-btn" onclick="updateTrack(${u.id}, '${u.title}')">Update</button>
                            <button class="delete-btn" onclick="deleteTrack(${u.id})">Delete</button>
                        </div>
                    </div>
                `).join('') : '<p class="text-gray-400">No tracks uploaded yet.</p>';
            })
            .catch(error => {
                console.error('Error fetching uploads:', error);
                document.getElementById('manageMusic').innerHTML = '<p class="text-gray-400">Error loading tracks.</p>';
            });
    }
    loadManageMusic();

    fetch('http://127.0.0.1:5000/contracts', { credentials: 'include' })
        .then(response => {
            console.log('Contracts response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch contracts');
            return response.json();
        })
        .then(data => {
            console.log('Contracts Data:', data);
            document.getElementById('contractsList').innerHTML = data.length ? data.map(c => `
                <div class="track-item">
                    <div class="track-info">
                        <h3 class="font-medium">${c.title}</h3>
                        <p class="text-sm text-gray-400">${new Date(c.date).toLocaleDateString()} - ${c.status}</p>
                    </div>
                </div>
            `).join('') : '<p class="text-gray-400">No active contracts yet.</p>';
        })
        .catch(error => {
            console.error('Error fetching contracts:', error);
            document.getElementById('contractsList').innerHTML = '<p class="text-gray-400">Error loading contracts.</p>';
        });

    document.getElementById('uploadSongForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('trackTitle').value;
        const songFile = document.getElementById('songFile').files[0];
        const formData = new FormData();
        formData.append('title', title);
        formData.append('song_file', songFile);

        fetch('http://127.0.0.1:5000/uploads', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(response => {
            console.log('Upload response status:', response.status);
            if (!response.ok) throw new Error('Upload failed');
            return response.json();
        })
        .then(data => {
            console.log('Upload response:', data);
            document.getElementById('upload-message').textContent = data.message;
            loadManageMusic();
        })
        .catch(error => {
            console.error('Upload error:', error);
            document.getElementById('upload-message').textContent = 'Upload failed. Check console.';
        });
    });
}

// Admin Dashboard - Only load content if on admin.html
if (document.querySelector('#platformChart')) {
    fetch('http://127.0.0.1:5000/admin/stats', { credentials: 'include' })
        .then(response => {
            console.log('Admin stats response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch admin stats');
            return response.json();
        })
        .then(data => {
            console.log('Admin Stats Data:', data);
            document.querySelectorAll('.stat-value')[0].textContent = data.total_artists;
            document.querySelectorAll('.stat-value')[1].textContent = data.active_tracks;
            document.querySelectorAll('.stat-value')[2].textContent = data.pending_reviews;
        })
        .catch(error => console.error('Error fetching admin stats:', error));

    fetch('http://127.0.0.1:5000/admin/platform_analytics', { credentials: 'include' })
        .then(response => {
            console.log('Platform analytics response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch platform analytics');
            return response.json();
        })
        .then(data => {
            console.log('Platform Analytics Data:', data);
            new ApexCharts(document.querySelector('#platformChart'), {
                ...chartOptions,
                series: [{ name: 'Streams', data: data.streams }],
                xaxis: { categories: data.days }
            }).render();
        })
        .catch(error => {
            console.error('Error fetching platform analytics:', error);
            document.getElementById('platformChart').innerHTML = '<p class="text-gray-400">Error loading chart.</p>';
        });

    fetch('http://127.0.0.1:5000/admin/pending_reviews', { credentials: 'include' })
        .then(response => {
            console.log('Pending reviews response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch pending reviews');
            return response.json();
        })
        .then(data => {
            console.log('Pending Reviews Data:', data);
            document.getElementById('pendingReviews').innerHTML = data.length ? data.map(r => `
                <div class="track-item" data-track-id="${r.id}">
                    <div class="track-info">
                        <h3 class="font-medium">${r.title}</h3>
                        <p class="text-sm text-gray-400">${new Date(r.upload_date).toLocaleDateString()} - Uploaded by ${r.username || 'Unknown Artist'}</p>
                    </div>
                    <button class="action-btn" onclick="approveTrack(${r.id})">Approve</button>
                </div>
            `).join('') : '<p class="text-gray-400">No pending reviews yet.</p>';
        })
        .catch(error => {
            console.error('Error fetching pending reviews:', error);
            document.getElementById('pendingReviews').innerHTML = '<p class="text-gray-400">Error loading reviews.</p>';
        });

    function loadArtists() {
        fetch('http://127.0.0.1:5000/admin/artists', { credentials: 'include' })
            .then(response => {
                console.log('Artists response status:', response.status);
                if (!response.ok) throw new Error('Failed to fetch artists');
                return response.json();
            })
            .then(data => {
                console.log('Artists Data:', data);
                document.getElementById('artistList').innerHTML = data.length ? data.map(a => `
                    <div class="track-item" data-artist-id="${a.id}">
                        <div class="track-info">
                            <h3 class="font-medium">${a.username}</h3>
                            <p class="text-sm text-gray-400">Artist ID: ${a.id}</p>
                        </div>
                        <button class="delete-btn" onclick="deleteArtist(${a.id})">Delete</button>
                    </div>
                `).join('') : '<p class="text-gray-400">No artists found.</p>';
            })
            .catch(error => {
                console.error('Error fetching artists:', error);
                document.getElementById('artistList').innerHTML = '<p class="text-gray-400">Error loading artists.</p>';
            });
    }
    loadArtists();

    document.getElementById('approveTrackForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const trackId = document.getElementById('trackId').value;
        approveTrack(trackId);
    });
}

// Admin approve track function
function approveTrack(trackId) {
    fetch('http://127.0.0.1:5000/admin/pending_reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Approve track response status:', response.status);
        if (!response.ok) throw new Error('Failed to approve track');
        return response.json();
    })
    .then(data => {
        console.log('Approve track response:', data);
        alert(data.message);
        fetch('http://127.0.0.1:5000/admin/pending_reviews', { credentials: 'include' })
            .then(res => res.json())
            .then(updatedData => {
                document.getElementById('pendingReviews').innerHTML = updatedData.length ? updatedData.map(r => `
                    <div class="track-item" data-track-id="${r.id}">
                        <div class="track-info">
                            <h3 class="font-medium">${r.title}</h3>
                            <p class="text-sm text-gray-400">${new Date(r.upload_date).toLocaleDateString()} - Uploaded by ${r.username || 'Unknown Artist'}</p>
                        </div>
                        <button class="action-btn" onclick="approveTrack(${r.id})">Approve</button>
                    </div>
                `).join('') : '<p class="text-gray-400">No pending reviews yet.</p>';
            });
    })
    .catch(error => {
        console.error('Approve track error:', error);
        alert('Failed to approve track. Check console.');
    });
}

// New Delete Artist function
function deleteArtist(artistId) {
    if (!confirm(`Are you sure you want to delete artist ID ${artistId}? This will remove all their data.`)) return;
    fetch('http://127.0.0.1:5000/admin/artists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_id: artistId }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Delete artist response status:', response.status);
        if (!response.ok) throw new Error('Failed to delete artist');
        return response.json();
    })
    .then(data => {
        console.log('Delete artist response:', data);
        alert(data.message);
        loadArtists();
    })
    .catch(error => {
        console.error('Delete artist error:', error);
        alert('Failed to delete artist. Check console.');
    });
}

// updating the track function
function updateTrack(trackId, currentTitle) {
    const newTitle = prompt('Enter new track title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    fetch('http://127.0.0.1:5000/uploads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId, title: newTitle }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Update track response status:', response.status);
        if (!response.ok) throw new Error('Failed to update track');
        return response.json();
    })
    .then(data => {
        console.log('Update track response:', data);
        alert(data.message);
        loadManageMusic();
    })
    .catch(error => {
        console.error('Update track error:', error);
        alert('Failed to update track. Check console.');
    });
}

// deleting the track function
function deleteTrack(trackId) {
    if (!confirm(`Are you sure you want to delete track ID ${trackId}?`)) return;
    fetch('http://127.0.0.1:5000/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Delete track response status:', response.status);
        if (!response.ok) throw new Error('Failed to delete track');
        return response.json();
    })
    .then(data => {
        console.log('Delete track response:', data);
        alert(data.message);
        loadManageMusic();
    })
    .catch(error => {
        console.error('Delete track error:', error);
        alert('Failed to delete track. Check console.');
    });
}

// play the track and log stream
function playTrack(event, trackId, filePath, audioId) {
    event.preventDefault();
    event.stopPropagation();
    console.log('Play button clicked:', { trackId, filePath: decodeURIComponent(filePath), audioId });

    const audio = document.getElementById(audioId);
    if (!audio) {
        console.error(`Audio element ${audioId} not found`);
        return;
    }

    const decodedFilePath = decodeURIComponent(filePath);
    console.log('Setting audio src:', decodedFilePath);
    audio.src = decodedFilePath;
    audio.style.display = 'block';

    audio.play()
        .then(() => {
            console.log('Audio started playing:', decodedFilePath);
            if (!audio.dataset.streamLogged) {
                fetch('http://127.0.0.1:5000/streams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ track_id: trackId }),
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Stream logged:', data);
                    audio.dataset.streamLogged = 'true';
                    loadRecommended();
                })
                .catch(error => console.error('Stream logging error:', error));
            }
        })
        .catch(error => {
            console.error('Audio playback error:', error);
            alert('Failed to play audio: ' + error.message);
        });

    audio.onended = () => {
        audio.dataset.streamLogged = 'false';
        audio.style.display = 'none';
        console.log('Audio ended:', decodedFilePath);
    };
}