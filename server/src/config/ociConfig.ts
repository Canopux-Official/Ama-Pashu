import * as oci from 'oci-sdk';

const IS_LOCAL_DEV = process.env.IS_LOCAL_DEV === 'true';

let provider: oci.common.ConfigFileAuthenticationDetailsProvider | null = null;

if (!IS_LOCAL_DEV) {
  try {
    provider = new oci.common.ConfigFileAuthenticationDetailsProvider();
  } catch (err) {
    console.error("OCI Config Error: Missing ~/.oci/config. If this is local dev, set IS_LOCAL_DEV=true in .env");
  }
}

export const objectStorageClient = provider ? new oci.objectstorage.ObjectStorageClient({
  authenticationDetailsProvider: provider
}) : null as any;

export const queueClient = provider ? new oci.queue.QueueClient({
  authenticationDetailsProvider: provider
}) : null as any;

export const OCI_NAMESPACE = process.env.OCI_NAMESPACE || 'your-namespace';
export const OCI_BUCKET_NAME = process.env.OCI_BUCKET_NAME || 'ama-gau-dhana-images';
export const OCI_QUEUE_ID = process.env.OCI_QUEUE_ID || 'ocid1.queue.oc1...';
