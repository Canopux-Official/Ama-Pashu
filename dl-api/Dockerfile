# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /code

# Install system dependencies required by OpenCV + git-lfs for model files
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 git git-lfs \
    && git lfs install \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
RUN pip install uvicorn python-dotenv

# Create a non-root user (Hugging Face requirement for some Docker spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

# Copy the rest of the application code
COPY --chown=user . $HOME/app

# Ensure LFS model files are resolved (not just pointers)
RUN if head -c 20 models/best.pt | grep -q "version https"; then \
        echo "ERROR: models/best.pt is still a Git LFS pointer!" && exit 1; \
    fi

# Hugging Face Spaces expose port 7860
EXPOSE 7860

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]