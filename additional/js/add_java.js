document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-product-form');
    const mainImageInput = document.getElementById('mainImage');

    form.addEventListener('submit', (e) => {
        console.log('Form submit attempted');
        let isValid = true;
        const fields = [
            { id: 'PName', errorId: 'PName-error', message: 'Product name is required' },
            { id: 'PCategory', errorId: 'PCategory-error', message: 'Category is required' },
            { id: 'PDescription', errorId: 'PDescription-error', message: 'Description is required' },
            { id: 'PShop', errorId: 'PShop-error', message: 'Brand is required' },
            { id: 'PSize', errorId: 'PSize-error', message: 'Size is required' },
            { id: 'PYear', errorId: 'PYear-error', message: 'Year is required' },
            { id: 'PPrice', errorId: 'PPrice-error', message: 'Price is required' }
        ];

        // Log form data
        const formData = new FormData(form);
        console.log('Form data before submission:', {
            PName: formData.get('PName'),
            PCategory: formData.get('PCategory'),
            PDescription: formData.get('PDescription'),
            PShop: formData.get('PShop'),
            PSize: formData.get('PSize'),
            PYear: formData.get('PYear'),
            PPrice: formData.get('PPrice'),
            PSeries: formData.get('PSeries'),
            PMaterial: formData.get('PMaterial'),
            PQuantity: formData.get('PQuantity'),
            mainImage: formData.get('mainImage') ? 'File selected' : 'No file'
        });

        // Validate text fields
        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const error = document.getElementById(field.errorId);
            input.classList.remove('invalid');
            error.textContent = '';
            if (!input.value.trim()) {
                input.classList.add('invalid');
                error.textContent = field.message;
                isValid = false;
            }
        });

        // Validate numbers
        const price = document.getElementById('PPrice');
        const year = document.getElementById('PYear');
        if (price.value && isNaN(parseFloat(price.value))) {
            price.classList.add('invalid');
            document.getElementById('PPrice-error').textContent = 'Price must be a valid number';
            isValid = false;
        }
        if (year.value && isNaN(parseInt(year.value))) {
            year.classList.add('invalid');
            document.getElementById('PYear-error').textContent = 'Year must be a valid number';
            isValid = false;
        }

        // Validate image
        if (!mainImageInput.files.length) {
            console.log('No image selected');
            alert('Main product image is required');
            isValid = false;
        }

        if (!isValid) {
            console.log('Client-side validation failed');
            e.preventDefault();
        } else {
            console.log('Form validation passed, submitting');
        }
    });
});