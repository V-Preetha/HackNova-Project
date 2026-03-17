# Read the doc: https://huggingface.co/docs/hub/spaces-sdks-docker
# you will also find guides on how best to write your Dockerfile

FROM python:3.9

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Expose port required by HuggingFace Spaces
EXPOSE 7860

# Copy only the backend folder requirements first so Docker can cache the installation
COPY --chown=user backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the entire backend into the container's app/backend folder
COPY --chown=user backend /app/backend

# Need to tell PyInstaller/Python where to look for modules
ENV PYTHONPATH=/app/backend

# Run the FastAPI server precisely as we do locally but mapped to Hugging Face's port 7860
CMD ["uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "7860"]
