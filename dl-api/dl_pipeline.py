import cv2
import torch
import base64
import requests
import numpy as np
from PIL import Image
from torchvision import transforms
from ultralytics import YOLO
from siamese_model import SiameseNetwork
from spoof_model import MuzzleSpoofDetector

class DLPipeline:
    def __init__(self, yolo_path: str, siamese_path: str, spoof_path: str = None):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading DL Models on {self.device.upper()}...")
        
        self.yolo_model = YOLO(yolo_path)
        
        self.siamese_model = SiameseNetwork().to(self.device)
        self.siamese_model.load_state_dict(torch.load(siamese_path, map_location=self.device))
        self.siamese_model.eval()
        
        # Load Spoof Model
        self.spoof_model = None
        if spoof_path:
            self.spoof_model = MuzzleSpoofDetector().to(self.device)
            self.spoof_model.load_state_dict(torch.load(spoof_path, map_location=self.device))
            self.spoof_model.eval()
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def decode_base64(self, b64_str: str) -> np.ndarray:
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
        img_data = base64.b64decode(b64_str)
        np_arr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    def download_image(self, url: str) -> np.ndarray:
        # Fetches the image from the URL provided by Express
        response = requests.get(url)
        response.raise_for_status()
        np_arr = np.frombuffer(response.content, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    def crop_muzzle(self, image: np.ndarray) -> np.ndarray:
        if image is None: return None
        results = self.yolo_model.predict(source=image, imgsz=640, conf=0.25, device="cpu", verbose=False)
        r = results[0]
        
        if r.boxes is None or len(r.boxes.xyxy) == 0:
            return None
            
        box = r.boxes.xyxy[0]
        x1, y1, x2, y2 = map(int, box)
        h, w = image.shape[:2]
        
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        return image[y1:y2, x1:x2]

    def get_embedding(self, cropped_image: np.ndarray) -> list:
        img_rgb = cv2.cvtColor(cropped_image, cv2.COLOR_BGR2RGB)
        img_pil = Image.fromarray(img_rgb)
        
        tensor_img = self.transform(img_pil).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding = self.siamese_model.forward_once(tensor_img)
            
        return embedding.cpu().numpy()[0].tolist()
        
    def is_spoof(self, image: np.ndarray) -> bool:
        if self.spoof_model is None or image is None:
            return False # Assume live if no model available
            
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        img_pil = Image.fromarray(img_rgb)
        
        tensor_img = self.transform(img_pil).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.spoof_model(tensor_img)
            probs = torch.nn.functional.softmax(output, dim=1)
            # Assuming class 0 = Live, class 1 = Spoof
            # If probability of spoof > 0.5, return True
            spoof_prob = probs[0][1].item()
            
        return spoof_prob > 0.5