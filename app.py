import sqlite3
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
# networkx, k_clique_communities, defaultdict は不要になるため削除
# import networkx as nx
# from networkx.algorithms.community import k_clique_communities
# from collections import defaultdict

app = Flask(__name__, static_folder='static') # static_folderを指定
CORS(app)

def get_db_connection():
    conn = sqlite3.connect('cardList.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/search')
def search_cards():
    query = request.args.get('query', '')
    conn = get_db_connection()
    cards = conn.execute('SELECT cardID, cardName FROM cardList WHERE cardName LIKE ? LIMIT 10', ('%' + query + '%',)).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in cards])

@app.route('/api/co-occurrence')
def get_co_occurrence():
    card_name = request.args.get('name', '')
    if not card_name:
        return jsonify({'error': 'カード名が指定されていません。'}), 400

    conn = get_db_connection()
    
    # まず、指定されたカード名からカードIDを取得
    card = conn.execute('SELECT cardID FROM cardList WHERE cardName = ?', (card_name,)).fetchone()
    
    if not card:
        conn.close()
        return jsonify({'error': '指定されたカードが見つかりません。'}), 404
        
    target_card_id = card['cardID']

    # 共起度を計算するクエリ
    query = """
    SELECT
        cl.cardName,
        COUNT(dc2.cardID) as count
    FROM deckCards dc1
    JOIN deckCards dc2 ON dc1.deckID = dc2.deckID AND dc1.cardID != dc2.cardID
    JOIN cardList cl ON dc2.cardID = cl.cardID
    WHERE dc1.cardID = ?
    GROUP BY dc2.cardID
    ORDER BY count DESC
    LIMIT 10
    """
    
    co_occurrence_data = conn.execute(query, (target_card_id,)).fetchall()
    conn.close()
    
    return jsonify([{'name': row['cardName'], 'count': row['count']} for row in co_occurrence_data])

# @app.route('/api/local-cluster') # このエンドポイントは削除
# def get_local_cluster():
#     # 以前のローカルクラスタリングのロジックは削除
#     pass

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
