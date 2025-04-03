import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion';
import { UploadCloud, Copy, Eye, User, Scissors, RotateCw } from 'lucide-react';

function getCroppedImg(imageSrc, croppedAreaPixels) {
  const canvas = document.createElement('canvas');
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = 'anonymous';
  return new Promise((resolve, reject) => {
    image.onload = () => {
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg');
    };
    image.onerror = reject;
  });
}

function getColorAtPoint(imageSrc, x, y, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(x, y, 1, 1).data;
    const rgb = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
    callback(rgb);
  };
}

export default function FaceColorRecommender() {
  const [image, setImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedImage, setCroppedImage] = useState(null);
  const [faceColor, setFaceColor] = useState(null);
  const [hairColor, setHairColor] = useState(null);
  const [eyeColor, setEyeColor] = useState(null);
  const [activeColorTarget, setActiveColorTarget] = useState('face');
  const [result, setResult] = useState(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setShowCropper(true);
      setCroppedImage(null);
      setResult(null);
    }
  };

  const onCropComplete = useCallback((_, croppedArea) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  const showCropped = async () => {
    if (!image || !croppedAreaPixels) return;
    const croppedImgUrl = await getCroppedImg(image, croppedAreaPixels);
    setCroppedImage(croppedImgUrl);
    setShowCropper(false);

    // Auto-detect approximate face/hair/eye color from cropped image
    const autoDetect = (label, xRatio, yRatio) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = croppedImgUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const x = Math.floor(img.width * xRatio);
        const y = Math.floor(img.height * yRatio);
        const data = ctx.getImageData(x, y, 1, 1).data;
        const rgb = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
        if (label === 'face') setFaceColor(rgb);
        if (label === 'hair') setHairColor(rgb);
        if (label === 'eyes') setEyeColor(rgb);
      };
    };

    autoDetect('face', 0.5, 0.6); // Center lower (face)
    autoDetect('hair', 0.5, 0.2); // Top center (hair)
    autoDetect('eyes', 0.5, 0.4); // Eye region
  };

  const handleClickImage = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = e.target.naturalWidth / rect.width;
    const scaleY = e.target.naturalHeight / rect.height;
    const imgX = Math.floor(x * scaleX);
    const imgY = Math.floor(y * scaleY);

    getColorAtPoint(croppedImage, imgX, imgY, (rgb) => {
      if (activeColorTarget === 'face') setFaceColor(rgb);
      else if (activeColorTarget === 'hair') setHairColor(rgb);
      else if (activeColorTarget === 'eyes') setEyeColor(rgb);
    });
  };

  const regenerateSuggestions = async () => {
    const baseColor = faceColor || hairColor || eyeColor;
    if (!baseColor) return;
  
    const rgbValues = baseColor.match(/\d+/g)?.join(',');
    const url = `https://www.thecolorapi.com/scheme?rgb=${rgbValues}&mode=analogic&count=5`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      const colors = data.colors.map((c) => ({
        color: c.hex.value,
        name: c.name.value,
      }));
      setResult({ tone: 'AI Palette Match', recommendedColors: colors });
    } catch (error) {
      console.error('Color API Error:', error);
    }
  };  

  const ColorSwatch = ({ label, color, icon, target }) => (
    <div
      onClick={() => setActiveColorTarget(target)}
      className={`flex flex-col items-center gap-2 px-5 py-4 rounded-2xl transition-all cursor-pointer border ${
        activeColorTarget === target
          ? 'border-white bg-gradient-to-b from-white/10 to-white/5 shadow-lg'
          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      <div className="text-sm font-semibold text-white mb-1">{label}</div>
      <div className="text-white">{icon}</div>
      <div
        className="w-6 h-6 rounded-full border border-white shadow-inner"
        style={{ backgroundColor: color || '#ccc' }}
      ></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1117] via-[#1c1f2b] to-[#000000] text-white flex flex-col font-sans">
     <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/80 backdrop-blur-sm">
  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
    {/* Logo and Branding */}
    <div className="flex items-center gap-2">
    <img src="./logo.png" alt="Pixora AI Logo" className="h-12 w-auto" />

      <span className="text-2xl font-bold text-white tracking-tight">Pixora AI</span>
    </div>

    {/* Navigation */}
    <nav className="hidden sm:flex gap-6 text-sm text-gray-400">
      <a href="#" className="hover:text-white">Features</a>
      <a href="#" className="hover:text-white">How it works</a>
      <a href="#" className="hover:text-white">Contact</a>
    </nav>
  </div>
</header>

      <main className="flex-1 p-6 sm:p-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
            Which Dress Color Suits You?
          </h1>
          <p className="mt-3 text-lg text-gray-400">
            Smart recommendations from your face, hair and eye colors
          </p>
        </motion.div>

        <div className="w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl bg-none border-none text-center rounded-3xl p-8 sm:p-6 sm:text-left shadow-2xl backdrop-blur-xl">
          {!image && (
            <label className="block w-full cursor-pointer border-2 border-dashed border-gray-600 rounded-2xl p-10 text-center hover:border-white transition">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center"
              >
                <UploadCloud className="w-12 h-12 text-white mb-2" />
                <p className="text-white font-medium">
                  Drag & Drop or Click to Upload
                </p>
              </motion.div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}

          {showCropper && image && (
            <div className="relative w-full h-[300px] bg-black mb-6 rounded-xl overflow-hidden">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
              <button
  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full font-semibold shadow-md text-sm sm:text-base hover:opacity-90 transition-all"
  onClick={showCropped}
>
  Confirm Crop & Continue
</button>

              </div>
            </div>
          )}

          {croppedImage && (
            <>
             <div className="flex flex-wrap justify-center gap-4 sm:gap-10 text-center mb-6">
  <ColorSwatch
    label="Face"
    color={faceColor}
    icon={<User className="w-4 h-4 sm:w-6 sm:h-6" />}
    target="face"
    className="w-16 h-16 sm:w-24 sm:h-24"
  />
  <ColorSwatch
    label="Hair"
    color={hairColor}
    icon={<Scissors className="w-4 h-4 sm:w-6 sm:h-6" />}
    target="hair"
    className="w-16 h-16 sm:w-24 sm:h-24"
  />
  <ColorSwatch
    label="Eyes"
    color={eyeColor}
    icon={<Eye className="w-4 h-4 sm:w-6 sm:h-6" />}
    target="eyes"
    className="w-16 h-16 sm:w-24 sm:h-24"
  />
</div>

              <p className="text-center text-sm text-gray-400 mb-4">
                Click your image to pick colors
              </p>
              <div className="w-full mb-6">
              <img
  src={croppedImage}
  alt="Cropped Preview"
  className="w-64 h-48 sm:w-full sm:h-72 mx-auto rounded-xl shadow-md cursor-crosshair inline-block"
  onClick={handleClickImage}
/>

              </div>
              <div className="flex justify-center gap-4 mb-6">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={regenerateSuggestions}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:to-indigo-700 text-white px-6 py-2 rounded-full shadow-lg text-sm font-semibold"
                >
                  Generate Dress Suggestions
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCropper(true)}
                  className="text-sm px-4 py-2 border border-white/30 rounded-full hover:bg-white/10 text-white flex items-center gap-2"
                >
                  <RotateCw className="w-4 h-4" /> Re-crop
                </motion.button>
              </div>
            </>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl w-full sm:bg-white/10 sm:p-4"
              >
              <p className="text-lg font-semibold mb-4 text-white">
                Suggested Colors for Tone: {result?.tone || 'N/A'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-6">
  {result.recommendedColors.map(({ color, name }) => (
    <div
      key={color}
      className="flex flex-col items-center rounded-xl bg-white/5 border border-white/10 shadow-md p-4 transition hover:scale-[1.02]"
    >
      <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border">
        <div className="absolute top-0 left-0 w-full h-1/2">
          <img
            src={croppedImage}
            alt="User Face Preview"
            className="w-full h-full object-cover"
          />
        </div>
        <div
          className="absolute bottom-0 left-0 w-full h-1/2"
          style={{ backgroundColor: color }}
        ></div>
      </div>
      
      <button
        onClick={() => {
          navigator.clipboard.writeText(color);
          alert("Color copied: " + color);
        }}
        className="mt-3 text-sm text-blue-300 hover:underline cursor-pointer"
      >
        {color} <Copy className="inline-block w-4 h-4 ml-1" />
      </button>

      <button
        onClick={() => {
          navigator.clipboard.writeText(name);
          alert("Name copied: " + name);
        }}
        className="mt-1 text-xs text-gray-400 hover:underline cursor-pointer"
      >
        {name} <Copy className="inline-block w-4 h-4 ml-1" />
      </button>
    </div>
  ))}
</div>

            </motion.div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-500 bg-transparent border-t border-white/10 mt-12">
        © {new Date().getFullYear()} Pixora — Built with ♥ for
        fashion-forward recommendations
      </footer>
    </div>
  );
}
