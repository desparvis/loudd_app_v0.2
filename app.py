from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import os

# configuring cloudinary
app = Flask(__name__)
app.secret_key = 'x7k9p2m4q8r5t1n3j6h0v2b5y8u3w9z1'
CORS(app, supports_credentials=True, origins=['http://127.0.0.1:5500'])

load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# getting db connection
def get_db_connection():
    conn = sqlite3.connect('datas.db')
    conn.row_factory = sqlite3.Row
    return conn

# authentication routes
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data['username']
    password = generate_password_hash(data['password'])
    role = data['role']
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', (username, password, role))
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        session['user_id'] = user['id']
        session['role'] = user['role']
        print(f"Registered: user_id={session['user_id']}, role={session['role']}")
        conn.close()
        return jsonify({'message': 'Registered and logged in', 'user': dict(user)}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'message': 'Username already exists'}), 400

# login routes
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (data['username'],)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], data['password']):
        session['user_id'] = user['id']
        session['role'] = user['role']
        print(f"Logged in: user_id={session['user_id']}, role={session['role']}")
        return jsonify({'message': 'Logged in', 'user': dict(user)}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

# logout routes
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('role', None)
    print("Logged out")
    return jsonify({'message': 'Logged out'}), 200

# general routes
@app.route('/user', methods=['GET'])
def get_user():
    if 'user_id' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    conn.close()
    return jsonify(dict(user))

# fan routes
@app.route('/fan/stats', methods=['GET'])
def get_fan_stats():
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    listened_songs = conn.execute('SELECT COUNT(DISTINCT track_id) FROM streams WHERE user_id = ?', (user_id,)).fetchone()[0] or 0
    favorite_tracks = conn.execute('SELECT t.id, t.title, t.upload_date FROM favorites f JOIN tracks t ON f.track_id = t.id WHERE f.user_id = ?', (user_id,)).fetchall()
    conn.close()
    return jsonify({
        'listened_songs': listened_songs,
        'favorite_tracks': [dict(t) for t in favorite_tracks]
    })

# fan listening routes
@app.route('/fan/listening_history', methods=['GET'])
def get_listening_history():
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    streams = conn.execute(
        'SELECT DATE(play_date) as date, COUNT(*) as count FROM streams WHERE user_id = ? AND play_date >= ? GROUP BY DATE(play_date)',
        (user_id, (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
    ).fetchall()
    conn.close()
    days = [row['date'] for row in streams]
    counts = [row['count'] for row in streams]
    return jsonify({'days': days, 'streams': counts})

# fan recently played routes
@app.route('/fan/recently_played', methods=['GET'])
def get_recently_played():
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    tracks = conn.execute(
        'SELECT t.id, t.title, t.upload_date, u.username '
        'FROM streams s JOIN tracks t ON s.track_id = t.id '
        'JOIN users u ON t.artist_id = u.id '
        'WHERE s.user_id = ? '
        'ORDER BY s.play_date DESC LIMIT 5',
        (user_id,)
    ).fetchall()
    conn.close()
    print(f"Recently Played tracks fetched: {[dict(t) for t in tracks]}")
    return jsonify([dict(track) for track in tracks])

# fan recommended routes
@app.route('/fan/recommended', methods=['GET'])
def get_recommended():
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    tracks = conn.execute(
        'SELECT t.id, t.title, t.upload_date, t.file_path, u.username '
        'FROM tracks t '
        'JOIN users u ON t.artist_id = u.id '
        'WHERE t.status = "Published" '
        'AND (t.id NOT IN (SELECT track_id FROM streams WHERE user_id = ?) OR t.upload_date > ?) '
        'ORDER BY t.upload_date DESC LIMIT 5',
        (user_id, (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
    ).fetchall()
    conn.close()
    print(f"Recommended tracks fetched: {[dict(t) for t in tracks]}")
    return jsonify([dict(track) for track in tracks])

# unused route for playlist
@app.route('/fan/playlists', methods=['GET', 'POST'])
def manage_playlists():
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO playlists (title, user_id) VALUES (?, ?)', (data['title'], user_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Playlist created'}), 201
    playlists = conn.execute('SELECT * FROM playlists WHERE user_id = ?', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(p) for p in playlists])

# unused routes for playlist tracks
@app.route('/fan/playlist_tracks/<int:playlist_id>', methods=['POST', 'DELETE'])
def manage_playlist_tracks(playlist_id):
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)', (playlist_id, data['track_id']))
        conn.commit()
    elif request.method == 'DELETE':
        data = request.json
        conn.execute('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', (playlist_id, data['track_id']))
        conn.commit()
    conn.close()
    return jsonify({'message': 'Playlist updated'}), 200

# route for fan's favorite
@app.route('/fan/favorites', methods=['GET', 'POST', 'DELETE'])
def manage_favorites():
    user_id = session.get('user_id', 1)
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO favorites (user_id, track_id) VALUES (?, ?)', (user_id, data['track_id']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Track favorited'}), 201
    elif request.method == 'DELETE':
        data = request.json
        conn.execute('DELETE FROM favorites WHERE user_id = ? AND track_id = ?', (user_id, data['track_id']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Track unfavorited'}), 200
    favorites = conn.execute('SELECT t.id, t.title, t.upload_date FROM favorites f JOIN tracks t ON f.track_id = t.id WHERE f.user_id = ?', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(f) for f in favorites])

# artist routes
@app.route('/artist/stats', methods=['GET'])
def get_artist_stats():
    artist_id = session.get('user_id', 1)
    conn = get_db_connection()
    total_streams = conn.execute('SELECT COUNT(*) FROM streams s JOIN tracks t ON s.track_id = t.id WHERE t.artist_id = ?', (artist_id,)).fetchone()[0] or 0
    total_songs = conn.execute('SELECT COUNT(*) FROM tracks WHERE artist_id = ?', (artist_id,)).fetchone()[0] or 0
    conn.close()
    return jsonify({
        'total_streams': total_streams,
        'total_songs': total_songs
    })

# streams routes
@app.route('/streams', methods=['GET', 'POST'])
def manage_streams():
    if request.method == 'POST':
        user_id = session.get('user_id', 1)
        data = request.json
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO streams (user_id, track_id, play_date) VALUES (?, ?, ?)',
            (user_id, data['track_id'], datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        )
        conn.commit()
        conn.close()
        print(f"Stream logged: user_id={user_id}, track_id={data['track_id']}")
        return jsonify({'message': 'Stream logged'}), 201
    artist_id = session.get('user_id', 1)
    conn = get_db_connection()
    streams = conn.execute(
        'SELECT DATE(s.play_date) as date, COUNT(*) as count FROM streams s JOIN tracks t ON s.track_id = t.id WHERE t.artist_id = ? AND s.play_date >= ? GROUP BY DATE(s.play_date)',
        (artist_id, (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
    ).fetchall()
    conn.close()
    days = [row['date'] for row in streams]
    counts = [row['count'] for row in streams]
    return jsonify({'days': days, 'streams': counts})

# uploads routes
@app.route('/uploads', methods=['GET', 'POST', 'PUT', 'DELETE'])
def manage_uploads():
    artist_id = session.get('user_id', 1)
    conn = get_db_connection()
    if request.method == 'POST':
        if 'song_file' in request.files:
            title = request.form['title']
            song_file = request.files['song_file']
            try:
                upload_result = cloudinary.uploader.upload(
                    song_file,
                    resource_type="raw",
                    public_id=f"songs/{artist_id}/{title}",
                    format=song_file.filename.split('.')[-1]
                )
                file_path = upload_result['secure_url']
                conn.execute(
                    'INSERT INTO tracks (title, artist_id, status, file_path) VALUES (?, ?, ?, ?)',
                    (title, artist_id, 'Processing', file_path)
                )
                conn.commit()
                conn.close()
                print(f"Uploaded to Cloudinary: {file_path}")
                return jsonify({'message': 'Song uploaded successfully'}), 201
            except Exception as e:
                conn.close()
                print(f"Upload error: {str(e)}")
                return jsonify({'message': 'Upload failed'}), 500
        data = request.json
        conn.execute(
            'INSERT INTO tracks (title, artist_id, album_id, status, file_path) VALUES (?, ?, ?, ?, ?)',
            (data['title'], artist_id, data.get('album_id'), 'Processing', data['file_path'])
        )
        conn.commit()
        conn.close()
        return jsonify({'message': 'Track uploaded'}), 201
    elif request.method == 'PUT':
        data = request.json
        track_id = data['track_id']
        new_title = data['title']
        track = conn.execute('SELECT * FROM tracks WHERE id = ? AND artist_id = ?', (track_id, artist_id)).fetchone()
        if not track:
            conn.close()
            return jsonify({'message': 'Track not found or not yours'}), 404
        conn.execute('UPDATE tracks SET title = ? WHERE id = ?', (new_title, track_id))
        conn.commit()
        conn.close()
        print(f"Track updated: track_id={track_id}, new_title={new_title}")
        return jsonify({'message': 'Track updated'}), 200
    elif request.method == 'DELETE':
        data = request.json
        track_id = data['track_id']
        track = conn.execute('SELECT * FROM tracks WHERE id = ? AND artist_id = ?', (track_id, artist_id)).fetchone()
        if not track:
            conn.close()
            return jsonify({'message': 'Track not found or not yours'}), 404
        conn.execute('DELETE FROM streams WHERE track_id = ?', (track_id,))
        conn.execute('DELETE FROM favorites WHERE track_id = ?', (track_id,))
        conn.execute('DELETE FROM playlist_tracks WHERE track_id = ?', (track_id,))
        conn.execute('DELETE FROM tracks WHERE id = ?', (track_id,))
        conn.commit()
        conn.close()
        print(f"Track deleted: track_id={track_id}")
        return jsonify({'message': 'Track deleted'}), 200
    uploads = conn.execute(
        'SELECT t.id, t.title, t.upload_date, t.status, u.username '
        'FROM tracks t JOIN users u ON t.artist_id = u.id '
        'WHERE t.artist_id = ? ORDER BY t.upload_date DESC',
        (artist_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(u) for u in uploads])

# ---  contracts routes ---
@app.route('/contracts', methods=['GET', 'PUT'])
def manage_contracts():
    artist_id = session.get('user_id', 1)
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.json
        conn.execute('UPDATE contracts SET status = "Signed" WHERE id = ? AND artist_id = ?', (data['contract_id'], artist_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Contract signed'}), 200
    contracts = conn.execute('SELECT id, title, date_issued as date, status FROM contracts WHERE artist_id = ?', (artist_id,)).fetchall()
    conn.close()
    return jsonify([dict(c) for c in contracts])

# album routes
@app.route('/albums', methods=['GET', 'POST'])
def manage_albums():
    artist_id = session.get('user_id', 1)
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO albums (title, artist_id) VALUES (?, ?)', (data['title'], artist_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Album created'}), 201
    albums = conn.execute('SELECT * FROM albums WHERE artist_id = ?', (artist_id,)).fetchall()
    conn.close()
    return jsonify([dict(a) for a in albums])

# admin routes
@app.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    conn = get_db_connection()
    total_artists = conn.execute('SELECT COUNT(*) FROM users WHERE role = "artist"').fetchone()[0]
    active_tracks = conn.execute('SELECT COUNT(*) FROM tracks WHERE status = "Published"').fetchone()[0]
    pending_reviews = conn.execute('SELECT COUNT(*) FROM tracks WHERE status = "Processing"').fetchone()[0]
    conn.close()
    return jsonify({
        'total_artists': total_artists,
        'active_tracks': active_tracks,
        'pending_reviews': pending_reviews
    })

# analytics routes
@app.route('/admin/platform_analytics', methods=['GET'])
def get_platform_analytics():
    conn = get_db_connection()
    streams = conn.execute(
        'SELECT DATE(play_date) as date, COUNT(*) as count FROM streams WHERE play_date >= ? GROUP BY DATE(play_date)',
        ((datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),)
    ).fetchall()
    conn.close()
    days = [row['date'] for row in streams]
    counts = [row['count'] for row in streams]
    return jsonify({'days': days, 'streams': counts})

#routes for pending reviews for admin
@app.route('/admin/pending_reviews', methods=['GET', 'PUT'])
def manage_pending_reviews():
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.json
        conn.execute('UPDATE tracks SET status = "Published" WHERE id = ?', (data['track_id'],))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Track approved'}), 200
    reviews = conn.execute('SELECT t.id, t.title, t.upload_date, u.username FROM tracks t JOIN users u ON t.artist_id = u.id WHERE t.status = "Processing"').fetchall()
    conn.close()
    return jsonify([dict(r) for r in reviews])

# managing artist routes for admin
@app.route('/admin/artists', methods=['GET', 'DELETE'])
def manage_artists():
    conn = get_db_connection()
    if request.method == 'DELETE':
        data = request.json
        artist_id = data['artist_id']
        if session.get('role') != 'admin':
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403
        conn.execute('DELETE FROM streams WHERE track_id IN (SELECT id FROM tracks WHERE artist_id = ?)', (artist_id,))
        conn.execute('DELETE FROM favorites WHERE track_id IN (SELECT id FROM tracks WHERE artist_id = ?)', (artist_id,))
        conn.execute('DELETE FROM playlist_tracks WHERE track_id IN (SELECT id FROM tracks WHERE artist_id = ?)', (artist_id,))
        conn.execute('DELETE FROM tracks WHERE artist_id = ?', (artist_id,))
        conn.execute('DELETE FROM albums WHERE artist_id = ?', (artist_id,))
        conn.execute('DELETE FROM contracts WHERE artist_id = ?', (artist_id,))
        conn.execute('DELETE FROM revenue WHERE artist_id = ?', (artist_id,))
        conn.execute('DELETE FROM users WHERE id = ? AND role = "artist"', (artist_id,))
        conn.commit()
        conn.close()
        print(f"Artist deleted: artist_id={artist_id}")
        return jsonify({'message': 'Artist deleted'}), 200
    artists = conn.execute('SELECT id, username FROM users WHERE role = "artist"').fetchall()
    conn.close()
    return jsonify([dict(a) for a in artists])

if __name__ == '__main__':
    app.run(debug=True)