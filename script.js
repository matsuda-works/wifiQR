document.addEventListener('DOMContentLoaded', () => {
    const ssidInput = document.getElementById('ssid');
    const passwordInput = document.getElementById('password');
    const encryptionInput = document.getElementById('encryption');
    const hiddenInput = document.getElementById('hidden');
    const generateBtn = document.getElementById('generate-btn');
    const qrResultContainer = document.getElementById('qr-result-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const displaySsid = document.getElementById('display-ssid');
    const downloadBtn = document.getElementById('download-btn');

    // 履歴・候補機能の要素
    const ssidSuggestions = document.getElementById('ssid-suggestions');
    const historyContainer = document.getElementById('history-container');
    const historyChips = document.getElementById('history-chips');
    const historyBadge = document.getElementById('history-badge');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const saveHistoryCheckbox = document.getElementById('save-history');
    const savePasswordCheckbox = document.getElementById('save-password');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');

    const STORAGE_KEY = 'wifi_connect_qr_history';
    let qrcode = null;

    // パスワード表示／非表示切り替え
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.textContent = isPassword ? '隠す' : '表示';
        });
    }

    // ブラウザの意図しないログイン誤認オートフィル（k2matsuda等）をクリア
    window.addEventListener('load', () => {
        setTimeout(() => {
            const history = getHistory();
            const isSavedSsid = history.some(item => item.ssid === ssidInput.value);
            // 履歴にない値が勝手に流し込まれている場合はクリア
            if (ssidInput.value && !isSavedSsid) {
                ssidInput.value = '';
                passwordInput.value = '';
            }
        }, 150);
    });

    // 履歴保存の連動制御（履歴OFFならパスワード保存もOFF）
    saveHistoryCheckbox.addEventListener('change', () => {
        if (!saveHistoryCheckbox.checked) {
            savePasswordCheckbox.checked = false;
            savePasswordCheckbox.disabled = true;
        } else {
            savePasswordCheckbox.disabled = false;
        }
    });

    // 履歴の読み込みと表示
    function getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            return [];
        }
    }

    function saveHistory(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }

    function renderHistory() {
        const history = getHistory();

        if (history.length === 0) {
            historyContainer.classList.add('hidden');
            historyBadge.classList.add('hidden');
            ssidSuggestions.innerHTML = '';
            historyChips.innerHTML = '';
            return;
        }

        historyContainer.classList.remove('hidden');
        historyBadge.classList.remove('hidden');

        // datalistの候補を更新
        ssidSuggestions.innerHTML = history
            .map(item => `<option value="${escapeHtml(item.ssid)}">${item.encryption !== 'nopass' ? '🔒 ' : ''}${escapeHtml(item.ssid)}</option>`)
            .join('');

        // チップ（ボタン）を生成
        historyChips.innerHTML = '';
        history.forEach((item, index) => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.title = `クリックして ${item.ssid} を入力`;

            const icon = item.encryption === 'nopass' ? '📶' : '🔒';
            chip.innerHTML = `
                <span class="chip-lock-icon">${icon}</span>
                <span class="chip-text">${escapeHtml(item.ssid)}</span>
                <span class="chip-delete" title="この候補を削除" data-index="${index}">×</span>
            `;

            // チップクリックでフォームに自動入力
            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('chip-delete')) return;
                applyHistoryItem(item);
            });

            // 削除ボタン
            const deleteBtn = chip.querySelector('.chip-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeHistoryItem(index);
            });

            historyChips.appendChild(chip);
        });
    }

    function applyHistoryItem(item) {
        ssidInput.value = item.ssid || '';
        encryptionInput.value = item.encryption || 'WPA';
        hiddenInput.checked = !!item.isHidden;
        if (item.password) {
            passwordInput.value = item.password;
        }
        ssidInput.focus();
    }

    function removeHistoryItem(index) {
        const history = getHistory();
        history.splice(index, 1);
        saveHistory(history);
        renderHistory();
    }

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('保存されたWi-Fi候補をすべて消去しますか？')) {
            localStorage.removeItem(STORAGE_KEY);
            renderHistory();
        }
    });

    function addOrUpdateHistory(entry) {
        let history = getHistory();
        // 既存の同一SSIDを除去して先頭に追加（最新順）
        history = history.filter(item => item.ssid.toLowerCase() !== entry.ssid.toLowerCase());
        history.unshift(entry);
        // 最大10件まで保持
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        saveHistory(history);
        renderHistory();
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }

    // 初回レンダリング
    renderHistory();

    generateBtn.addEventListener('click', () => {
        const ssid = ssidInput.value.trim();
        const password = passwordInput.value;
        const encryption = encryptionInput.value;
        const isHidden = hiddenInput.checked;

        if (!ssid) {
            alert('SSIDを入力してください。');
            return;
        }

        // 履歴保存の処理
        if (saveHistoryCheckbox.checked) {
            addOrUpdateHistory({
                ssid: ssid,
                encryption: encryption,
                isHidden: isHidden,
                password: savePasswordCheckbox.checked ? password : ''
            });
        }

        // WiFi QR Code Format: WIFI:S:<SSID>;T:<WPA|WEP|>;P:<password>;H:<true|false>;;
        const qrContent = `WIFI:S:${escapeString(ssid)};T:${encryption};P:${escapeString(password)};H:${isHidden};;`;

        // Clear previous QR code
        qrcodeDiv.innerHTML = '';
        
        // Show container
        qrResultContainer.classList.remove('hidden');
        displaySsid.textContent = ssid;

        // Generate new QR code
        qrcode = new QRCode(qrcodeDiv, {
            text: qrContent,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Small delay to ensure QR is rendered before scrolling
        setTimeout(() => {
            qrResultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    });

    function escapeString(str) {
        // Special characters in WiFi QR codes need to be escaped with backslash
        return str.replace(/\\/g, '\\\\')
                  .replace(/;/g, '\\;')
                  .replace(/:/g, '\\:')
                  .replace(/,/g, '\\,');
    }

    downloadBtn.addEventListener('click', () => {
        const img = qrcodeDiv.querySelector('img');
        if (img) {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `wifi-qr-${ssidInput.value}.png`;
            link.click();
        } else {
            // QRcode.js might render to canvas instead of img in some conditions
            const canvas = qrcodeDiv.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `wifi-qr-${ssidInput.value}.png`;
                link.click();
            }
        }
    });
});

