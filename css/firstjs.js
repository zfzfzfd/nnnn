const slideshowImages = document.querySelectorAll(".login-right .login-image");

const nextImageDelay = 5000;
let currentImageCounter = 0;

setInterval(nextImage, nextImageDelay);

function nextImage() {
     slideshowImages[currentImageCounter].style.opacity = "0";
     currentImageCounter = (currentImageCounter + 1) % slideshowImages.length;
     slideshowImages[currentImageCounter].style.opacity = "1";
}