function showAndHide(tabId, iconId) {
    const tab = document.getElementById(tabId);
    const icon = document.getElementById(iconId);

    if (tab.classList.contains('active')) {
        tab.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
    } else {
        // Close all other tabs
        document.querySelectorAll('.slide-tab').forEach(otherTab => {
            if (otherTab !== tab) {
                otherTab.classList.remove('active');
                const otherIcon = otherTab.previousElementSibling.querySelector('i');
                if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
            }
        });
        tab.classList.add('active');
        icon.style.transform = 'rotate(180deg)';
    }
}
        function previewImage(event, input) {
            const reader = new FileReader();
            reader.onload = function() {
                const imageBox = input.parentNode;
                const img = document.createElement('img');
                img.src = reader.result;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                imageBox.innerHTML = ''; // Clear existing content
                imageBox.appendChild(img); // Append the image
            };
            reader.readAsDataURL(event.target.files[0]);
        }
        function validateForm() {
            const requiredFields = [
                'Product name',
                'Category',
                'Product description',
                'Brand',
                'Size',
                'Color',
                'Material',
                'Price',
                'Stock'
            ];
            let isValid = true;
            requiredFields.forEach(field => {
                const input = document.querySelector(`input[name="${field}"]`);
                if (input && !input.value) {
                    isValid = false;
                    alert(`${field} is required.`);
                    input.focus();
                    return false; // Exit the loop on first invalid field
                }
            });
            return isValid;
        }