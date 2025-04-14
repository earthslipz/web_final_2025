function search() {
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById('userinput');
    filter = input.value.toUpperCase();
    ul = document.getElementById("myUL");
    li = ul.getElementsByTagName('li');
  
    for (i = 0; i < li.length; i++) {
      a = li[i].getElementsByTagName("a")[0];
      txtValue = a.textContent || a.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        li[i].style.display = "";
      } else {
        li[i].style.display = "none";
      }
    }
  }
  
  function toggleProducts(id) {
    var element = document.getElementById(id);
    element.style.display = (element.style.display === "none" || element.style.display === "") ? "grid" : "none";
  }
  
  const Csuggestions = [
    { name: 'Category Name1', url: 'category-result.html' },
    { name: 'Category Name2', url: 'category-result.html' },
    { name: 'Category Name3', url: 'category-result.html' },
    { name: 'Category Name4', url: 'category-result.html' },
    { name: 'Category Name5', url: 'category-result.html' },
  ];
  
  function showCSuggestions() {
    const input = document.getElementById('userinput').value.toLowerCase();
    const suggestionsContainer = document.getElementById('suggestions-container');
    
    if (input === "") {
        suggestionsContainer.style.display = "none";
        return;
    }
  
    const filteredSuggestions = Csuggestions.filter(Csuggestion =>
        Csuggestion.name.toLowerCase().includes(input)
    );
  
    if (filteredSuggestions.length > 0) {
        suggestionsContainer.style.display = "block";
        suggestionsContainer.innerHTML = filteredSuggestions.map(Csuggestion =>
            `<a href="${Csuggestion.url}" class="suggestion-item">${Csuggestion.name}</a>`
        ).join('');
    } else {
        suggestionsContainer.style.display = "none";
    }
    
    document.getElementById('userinput').addEventListener('input', showCSuggestions);
  }
  
  
  const Dsuggestions = [
    { name: 'Product Name1', url: 'delete-result.html' },
    { name: 'Product Name2', url: 'delete-result.html' },
    { name: 'Product Name3', url: 'delete-result.html' },
    { name: 'Product Name4', url: 'delete-result.html' },
    { name: 'Product Name5', url: 'delete-result.html' },
  ];
  
  function showDSuggestions() {
    const input = document.getElementById('userinput').value.toLowerCase();
    const suggestionsContainer = document.getElementById('suggestions-container');
    
    if (input === "") {
        suggestionsContainer.style.display = "none";
        return;
    }
  
    const filteredSuggestions = Dsuggestions.filter(Dsuggestion =>
        Dsuggestion.name.toLowerCase().includes(input)
    );
  
    if (filteredSuggestions.length > 0) {
        suggestionsContainer.style.display = "block";
        suggestionsContainer.innerHTML = filteredSuggestions.map(Dsuggestion =>
            `<a href="${Dsuggestion.url}" class="suggestion-item">${Dsuggestion.name}</a>`
        ).join('');
    } else {
        suggestionsContainer.style.display = "none";
    }
  
    document.getElementById('userinput').addEventListener('input', showDSuggestions);
  }
  
  function toggleProducts(id) {
    const element = document.getElementById(id);
    element.style.display = element.style.display === 'block' ? 'none' : 'block';
}

function showCSuggestions() {
    const input = document.getElementById('userinput').value;
    const suggestionsContainer = document.getElementById('suggestions-container');

    if (input.length < 1) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        return;
    }

    fetch(`/search-suggestions?q=${encodeURIComponent(input)}`)
        .then(response => response.json())
        .then(data => {
            suggestionsContainer.innerHTML = '';
            if (data.length === 0) {
                suggestionsContainer.innerHTML = '<p>No results found</p>';
            } else {
                data.forEach(product => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'suggestion-item';
                    suggestion.innerHTML = `
                        <a href="/detail?pid=${product.PID}">
                            <img src="${product.PImage}" alt="${product.PName}" style="width: 15px; height: 15px;">
                            ${product.PName}
                        </a>
                    `;
                    suggestionsContainer.appendChild(suggestion);
                });
            }
            suggestionsContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            suggestionsContainer.innerHTML = '<p>Error loading suggestions</p>';
            suggestionsContainer.style.display = 'block';
        });
}