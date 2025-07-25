document.addEventListener('DOMContentLoaded', function() {
    // --- DOM要素の取得 ---
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.content');
    const searchInput = document.getElementById('searchInput');
    const resultsList = document.getElementById('resultsList');

    const coOccurrenceInput = document.getElementById('coOccurrenceInput');
    const coOccurrenceAutocompleteList = document.getElementById('coOccurrenceAutocompleteList');
    const coOccurrenceList = document.getElementById('coOccurrenceList');

    const communityInput = document.getElementById('communityInput');
    const communityAutocompleteList = document.getElementById('communityAutocompleteList');
    const communityResultsList = document.getElementById('communityResultsList');

    let mergedCommunitiesData = []; // merged_communities.json のデータを保持する変数

    // --- タブ切り替え機能 ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const contentId = tab.getAttribute('data-tab') + '-content';
            document.getElementById(contentId).classList.add('active');

            // コミュニティタブが選択されたらコミュニティデータをロード
            if (tab.getAttribute('data-tab') === 'community' && mergedCommunitiesData.length === 0) {
                loadMergedCommunities();
            }
        });
    });

    // --- カード検索機能 ---
    async function searchCards() {
        const query = searchInput.value;
        if (query.length < 1) {
            resultsList.innerHTML = '';
            return;
        }
        try {
            const response = await fetch(`/api/search?query=${query}`);
            const cards = await response.json();
            resultsList.innerHTML = '';
            if (cards.length > 0) {
                cards.forEach(card => {
                    const li = document.createElement('li');
                    li.textContent = card.cardName; 
                    resultsList.appendChild(li);
                });
            } else {
                resultsList.innerHTML = '<li>一致するカードが見つかりませんでした。</li>';
            }
        } catch (error) {
            console.error('Error fetching card search results:', error);
            resultsList.innerHTML = '<li>検索中にエラーが発生しました。</li>';
        }
    }

    // --- 共起度ランキング検索機能 ---
    async function searchCoOccurrence(cardName) {
        if (cardName.length === 0) {
            coOccurrenceList.innerHTML = '';
            return;
        }
        coOccurrenceList.innerHTML = '<li>検索中...</li>';
        try {
            const response = await fetch(`/api/co-occurrence?name=${encodeURIComponent(cardName)}`);
            const data = await response.json();
            coOccurrenceList.innerHTML = '';

            if (data.error) {
                coOccurrenceList.innerHTML = `<li>${data.error}</li>`;
            } else if (data.length > 0) {
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = `${item.name} (共起回数: ${item.count})`;
                    coOccurrenceList.appendChild(li);
                });
            } else {
                coOccurrenceList.innerHTML = '<li>共起するカードが見つかりませんでした。</li>';
            }
        } catch (error) {
            console.error('Error fetching co-occurrence data:', error);
            coOccurrenceList.innerHTML = '<li>検索中にエラーが発生しました。</li>';
        }
    }

    // --- コミュニティランキング機能 ---
    async function loadMergedCommunities() {
        try {
            const response = await fetch('/static/merged_communities.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            mergedCommunitiesData = await response.json();
            console.log('Merged communities loaded:', mergedCommunitiesData.length);
        } catch (error) {
            console.error('Error loading merged communities:', error);
            communityResultsList.innerHTML = '<li>コミュニティデータのロード中にエラーが発生しました。</li>';
        }
    }

    function displayCommunitiesForCard(cardName) {
        communityResultsList.innerHTML = ''; // 検索ごとにリストをクリア
        if (cardName.length === 0) {
            return;
        }

        const foundCommunities = [];
        mergedCommunitiesData.forEach((community, index) => {
            if (community.includes(cardName)) {
                foundCommunities.push({
                    community: community,
                    index: index + 1 // 1から始まるインデックス
                });
            }
        });

        if (foundCommunities.length > 0) {
            // コミュニティのサイズでソート（大きい順）
            foundCommunities.sort((a, b) => b.community.length - a.community.length);

            foundCommunities.forEach(item => {
                const li = document.createElement('li');
                const representativeCards = item.community.slice(0, 5).join(', '); // 代表カード5枚
                const fullCards = item.community.join(', '); // 全カード

                li.innerHTML = `
                    <strong>コミュニティ ${item.index} (${item.community.length}枚):</strong>
                    <span class="representative-cards">${representativeCards}</span>
                    <span class="toggle-detail" style="cursor: pointer; color: blue;">...詳細</span>
                    <span class="full-cards" style="display: none;">${fullCards}</span>
                `;
                communityResultsList.appendChild(li);

                // 詳細表示のトグル機能
                const toggleDetailSpan = li.querySelector('.toggle-detail');
                const representativeCardsSpan = li.querySelector('.representative-cards');
                const fullCardsSpan = li.querySelector('.full-cards');

                toggleDetailSpan.addEventListener('click', function() {
                    if (fullCardsSpan.style.display === 'none') {
                        fullCardsSpan.style.display = 'inline';
                        representativeCardsSpan.style.display = 'none';
                        toggleDetailSpan.textContent = '...閉じる';
                    } else {
                        fullCardsSpan.style.display = 'none';
                        representativeCardsSpan.style.display = 'inline';
                        toggleDetailSpan.textContent = '...詳細';
                    }
                });
            });
        } else {
            communityResultsList.innerHTML = '<li>このカードが含まれるコミュニティは見つかりませんでした。</li>';
        }
    }

    // --- オートコンプリート機能の共通化 ---
    async function autocomplete(inputElement, autocompleteListElement, callbackFunction) {
        const query = inputElement.value;
        autocompleteListElement.innerHTML = '';
        if (query.length < 1) {
            return;
        }
        try {
            const response = await fetch(`/api/search?query=${query}`);
            const cards = await response.json();
            if (cards.length > 0) {
                cards.forEach(card => {
                    const item = document.createElement('div');
                    item.textContent = card.cardName;
                    item.addEventListener('click', function() {
                        inputElement.value = this.textContent;
                        autocompleteListElement.innerHTML = '';
                        callbackFunction(this.textContent); // 選択されたカード名でコールバック関数を実行
                    });
                    autocompleteListElement.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Error fetching autocomplete data:', error);
        }
    }

    // --- イベントリスナー ---
    searchInput.addEventListener('input', searchCards);

    // 共起度ランキングのオートコンプリート
    coOccurrenceInput.addEventListener('input', () => autocomplete(coOccurrenceInput, coOccurrenceAutocompleteList, searchCoOccurrence));
    // コミュニティランキングのオートコンプリート
    communityInput.addEventListener('input', () => autocomplete(communityInput, communityAutocompleteList, displayCommunitiesForCard));

    // ドキュメント全体をクリックしたときにオートコンプリートリストを非表示にする
    document.addEventListener('click', function(e) {
        if (!coOccurrenceInput.contains(e.target) && !coOccurrenceAutocompleteList.contains(e.target)) {
            coOccurrenceAutocompleteList.innerHTML = '';
        }
        if (!communityInput.contains(e.target) && !communityAutocompleteList.contains(e.target)) {
            communityAutocompleteList.innerHTML = '';
        }
    });

    // 初期ロード時にコミュニティデータをロード
    loadMergedCommunities();
});



