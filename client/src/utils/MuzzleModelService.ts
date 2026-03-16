import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

const MODEL_URL = '/model/muzzle/model.json';
const MODEL_INPUT_SIZE: [number, number] = [640, 640];

let cachedModel: tf.GraphModel | null = null;
let loadPromise: Promise<tf.GraphModel> | null = null;

export const preloadMuzzleModel = (): Promise<tf.GraphModel> => {
    // If already loading or loaded, return the existing promise
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        try {
            await tf.ready();
            const loadedModel = await tf.loadGraphModel(MODEL_URL);

            // WebGL Shader Warm-up (Crucial for instant first-inference)
            const dummy = tf.zeros([1, MODEL_INPUT_SIZE[0], MODEL_INPUT_SIZE[1], 3]);
            const warmupResult = await loadedModel.executeAsync(dummy) as tf.Tensor;

            // Clean up memory
            warmupResult.dispose();
            dummy.dispose();

            cachedModel = loadedModel;
            console.log('✅ Global AI Model Preloaded & Warmed Up');
            return loadedModel;
        } catch (error) {
            console.error('❌ Failed to preload AI model:', error);
            loadPromise = null; // Reset so we can try again if it fails
            throw error;
        }
    })();

    return loadPromise;
};

// Components call this to get the model. 
// If it's already preloaded, it resolves instantly.
export const getMuzzleModel = async (): Promise<tf.GraphModel> => {
    if (cachedModel) return cachedModel;
    return preloadMuzzleModel();
};