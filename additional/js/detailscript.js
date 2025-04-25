function ShowAndHide(classname, iconname) {
    var context = document.getElementById(classname);
    var icon = document.getElementById(iconname);
    var children = context.children;
    if (icon.src.includes("Icon_up.png")) {
        for (let i = 0; i < children.length; i++) {
            if (children[i].tagName !== "H3") {
                children[i].style.display = "none";
            }
        }
        icon.src = "icon/Icon_down.png";
    } else {
        for (let i = 0; i < children.length; i++) {
            children[i].style.display = "block";
        }
        icon.src = "icon/Icon_up.png";
    }
}

/*quantity*/
document.addEventListener("DOMContentLoaded", function () {
    const 
    plus = document.querySelector(".plus"),
    minus = document.querySelector(".minus"),
    num = document.querySelector(".num");
    
    let a = 1;

    if (!plus || !minus || !num) {
        console.error("One or more elements not found!");
        return;
    }

    plus.addEventListener("click", () => {
        console.log("Plus clicked");  // Debugging line
        a++;
        num.innerText = a < 10 ? "0" + a : a;
    });

    minus.addEventListener("click", () => {
        console.log("Minus clicked");  // Debugging line
        if (a > 1) {
            a--;
            num.innerText = a < 10 ? "0" + a : a;
        }
    });
});

/*preview img*/
document.addEventListener("DOMContentLoaded", function () {
    const prev = document.querySelector(".ProductPreview"),
          listimgs = document.querySelectorAll(".ProductListImg"); // Select all images

    if (!prev || listimgs.length === 0) {
        console.error("Elements not found!");
        return;
    }

    listimgs.forEach(img => {
        img.addEventListener("click", function () {
            prev.src = this.src; // Update preview image
        });
    });
});


// change icon color
function iconcolor(iconid){
    var icon = document.getElementById(iconid);
    //dislike
    if (icon.src.includes("icon_dislike.png")) {
        icon.src = "icon/icon_dislikecolor.png";
    }else if (icon.src.includes("icon_dislikecolor.png")) {
        icon.src = "icon/icon_dislike.png";
    }else if (icon.src.includes("icon_like.png")) { //like
        icon.src = "icon/icon_likecolor.png";
    }else if (icon.src.includes("icon_likecolor.png")) {
        icon.src = "icon/icon_like.png";
    }else if (icon.src.includes("icon_hart.png")) { //hart
        icon.src = "icon/icon_hartcolor.png";
    }else if (icon.src.includes("icon_hartcolor.png")) {
        icon.src = "icon/icon_hart.png";
    }
    
}

javascript

Collapse

Wrap

Copy
// ฟังก์ชันที่มีอยู่เดิมในหน้า detail
function iconcolor(id) {
  const element = document.getElementById(id);
  if (element.src.includes("icon_hart.png")) {
    element.src = "/image/detailpage/icon/icon_hart_red.png";
  } else if (element.src.includes("icon_hart_red.png")) {
    element.src = "/image/detailpage/icon/icon_hart.png";
  } else if (element.src.includes("icon_like.png")) {
    element.src = "/image/detailpage/icon/icon_like_blue.png";
  } else if (element.src.includes("icon_like_blue.png")) {
    element.src = "/image/detailpage/icon/icon_like.png";
  } else if (element.src.includes("icon_dislike.png")) {
    element.src = "/image/detailpage/icon/icon_dislike_red.png";
  } else if (element.src.includes("icon_dislike_red.png")) {
    element.src = "/image/detailpage/icon/icon_dislike.png";
  }
}

function ShowAndHide(sectionId, iconId) {
  const section = document.getElementById(sectionId);
  const icon = document.getElementById(iconId);
  if (section.style.display === "none") {
    section.style.display = "block";
    icon.src = "/image/detailpage/icon/Icon_up.png";
  } else {
    section.style.display = "none";
    icon.src = "/image/detailpage/icon/Icon_down.png";
  }
}

// ฟังก์ชันสำหรับ ExchangeRate API
document.addEventListener('DOMContentLoaded', () => {
  const currencySelect = document.getElementById('currencySelect');
  let exchangeRates = null;

  // ฟังก์ชันดึงอัตราแลกเปลี่ยน
  async function fetchExchangeRates(baseCurrency = 'THB') {
    const apiKey = '8ef60133002ad4147e19cf8d'; // แทนที่ด้วย API Key จริงจาก ExchangeRate-API
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`;

    try {
      console.log('Fetching exchange rates...');
      const response = await fetch(url);
      const data = await response.json();
      if (data.result === 'success') {
        exchangeRates = data.conversion_rates;
        console.log('Exchange rates loaded:', exchangeRates);
        return exchangeRates;
      } else {
        console.error('API error:', data.error_type);
        return null;
      }
    } catch (error) {
      console.error('Fetch exchange rates failed:', error);
      return null;
    }
  }

  // ฟังก์ชันอัปเดตราคา
  function updatePrices(currency) {
    if (!exchangeRates) {
      console.error('No exchange rates available');
      return;
    }
    const rate = exchangeRates[currency];
    if (!rate) {
      console.error(`No rate for currency ${currency}`);
      return;
    }
    const symbols = { 'THB': '฿', 'USD': '$', 'EUR': '€' };

    console.log(`Updating prices for ${currency}, rate: ${rate}`);

    // อัปเดตราคาสินค้าหลัก
    const mainPriceElement = document.getElementById('price');
    const currencySymbolElement = document.getElementById('currencySymbol');
    if (mainPriceElement && currencySymbolElement) {
      const basePrice = parseFloat(mainPriceElement.getAttribute('data-base-price'));
      if (!isNaN(basePrice)) {
        const convertedPrice = (basePrice * rate).toFixed(2);
        mainPriceElement.textContent = convertedPrice;
        currencySymbolElement.textContent = symbols[currency];
      } else {
        console.warn('Invalid base price for main product');
      }
    } else {
      console.error('Main price or currency symbol element not found');
    }

    // อัปเดตราคาสินค้าแนะนำ
    const recommendPriceElements = document.querySelectorAll('.price');
    recommendPriceElements.forEach(element => {
      const basePrice = parseFloat(element.getAttribute('data-base-price'));
      if (!isNaN(basePrice)) {
        const convertedPrice = (basePrice * rate).toFixed(2);
        element.textContent = `${symbols[currency]} ${convertedPrice}`;
      } else {
        console.warn('Invalid base price for recommend item:', element);
      }
    });
  }

  // โหลดอัตราแลกเปลี่ยนเมื่อหน้าโหลด
  fetchExchangeRates().then(() => {
    if (exchangeRates) {
      updatePrices('THB'); // เริ่มต้นที่ THB
    } else {
      console.error('Failed to initialize exchange rates');
    }
  });

  // Event listener สำหรับเปลี่ยนสกุลเงิน
  if (currencySelect) {
    currencySelect.addEventListener('change', (event) => {
      const selectedCurrency = event.target.value;
      console.log('Currency changed to:', selectedCurrency);
      if (exchangeRates) {
        updatePrices(selectedCurrency);
      } else {
        fetchExchangeRates().then(() => {
          if (exchangeRates) {
            updatePrices(selectedCurrency);
          }
        });
      }
    });
  } else {
    console.error('Currency select element not found');
  }
});

// /js/detailscript.js
document.addEventListener('DOMContentLoaded', () => {
  // ดึงค่า PRating จาก HTML (ถูกฝังโดย EJS)
  const ratingElement = document.querySelector('h6#norating');
  const rating = parseFloat(ratingElement.textContent) || 0; // แปลงเป็นตัวเลข หรือ 0 ถ้าเป็น 'N/A'

  // ดึง element ของดาวทั้ง 5 ดวง
  const stars = [
      document.getElementById('s1'),
      document.getElementById('s2'),
      document.getElementById('s3'),
      document.getElementById('s4'),
      document.getElementById('s5')
  ];

  // คำนวณจำนวนดาวเต็มและดาวครึ่ง
  const fullStars = Math.floor(rating); // จำนวนดาวเต็ม
  const hasHalfStar = rating % 1 >= 0.5; // ตรวจสอบว่ามีดาวครึ่งดวงหรือไม่

  // อัปเดตรูปภาพดาว
  stars.forEach((star, index) => {
      if (index < fullStars) {
          // ดาวเต็ม
          star.src = '/image/detailpage/icon/Icon_star_filled.png';
      } else if (index === fullStars && hasHalfStar) {
          // ดาวครึ่งดวง
          star.src = '/image/detailpage/icon/Icon_star_half.png';
      } else {
          // ดาวว่าง
          star.src = '/image/detailpage/icon/Icon_star_empty.png';
      }
  });
});
const productStars = document.querySelectorAll('.ProductDetail-flexrow[alt="rating star"] .star');
productStars.forEach((star, index) => {
    if (index < fullStars) {
        star.src = '/image/detailpage/icon/Icon_star_filled.png';
    } else if (index === fullStars && hasHalfStar) {
        star.src = '/image/detailpage/icon/Icon_star_half.png';
    } else {
        star.src = '/image/detailpage/icon/Icon_star_empty.png';
    }
});