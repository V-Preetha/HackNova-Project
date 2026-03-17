## Model files

This MVP expects a model at:

- `backend/model/model.pth`

Supported formats:

- TorchScript module (recommended for deployment)
- A fully saved `torch.nn.Module` (`torch.save(model, path)`)

If your `.pth` is only a `state_dict`, you must also provide the Python architecture code to load it.

