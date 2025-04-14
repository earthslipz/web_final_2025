async function showDSuggestions() {
    const input = document.getElementById('userinput').value;
    const suggestionsContainer = document.getElementById('suggestions-container');
    
    suggestionsContainer.innerHTML = '';
    
    if (input.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/search-suggestions?q=${encodeURIComponent(input)}`);
        const suggestions = await response.json();
        
        if (suggestions.length > 0) {
            suggestionsContainer.style.display = 'block';
            suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.classList.add('suggestion-item');
                div.innerHTML = `
                    <img src="${suggestion.PImage}" alt="${suggestion.PName}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
                    ${suggestion.PName}
                `;
                div.addEventListener('click', () => {
                    document.getElementById('userinput').value = suggestion.PName;
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';
                    filterProducts(suggestion.PName);
                });
                suggestionsContainer.appendChild(div);
            });
        } else {
            suggestionsContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function filterProducts(searchTerm) {
    const products = document.querySelectorAll('.product');
    products.forEach(product => {
        const name = product.querySelector('.Dprodtxt').textContent.toLowerCase();
        if (searchTerm.toLowerCase() === '' || name.includes(searchTerm.toLowerCase())) {
            product.style.display = 'block';
        } else {
            product.style.display = 'none';
        }
    });
}

// Handle delete modal
document.addEventListener('DOMContentLoaded', () => {
    const trashIcons = document.querySelectorAll('.trash');
    const modalProductName = document.getElementById('modalProductName');
    const deletePidInput = document.getElementById('deletePid');
    
    trashIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const pid = icon.getAttribute('data-pid');
            const name = icon.getAttribute('data-name');
            modalProductName.textContent = name;
            deletePidInput.value = pid;
        });
    });
});