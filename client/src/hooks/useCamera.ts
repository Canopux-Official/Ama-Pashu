import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const useCamera = () => {
    const [photo, setPhoto] = useState<string | null>(null);

    const takePhoto = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });

            const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
            setPhoto(imageUrl);
            return imageUrl;
        } catch (error) {
            console.log('Camera cancelled', error);
            return null;
        }
    };

    return { photo, takePhoto };
};