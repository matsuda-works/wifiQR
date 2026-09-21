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

    let qrcode = null;

    generateBtn.addEventListener('click', () => {
        const ssid = ssidInput.value.trim();
        const password = passwordInput.value;
        const encryption = encryptionInput.value;
        const isHidden = hiddenInput.checked;

        if (!ssid) {
            alert('SSIDを入力してください。');
            return;
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
