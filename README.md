# Kleos

A full-stack blockchain project with frontend, smart contracts, and agent components.

## Project Structure

```
kleos/
├── frontend/     # Next.js frontend application
├── contracts/    # Solidity smart contracts with Forge
└── agent/        # Python agent service
```

## Quick Start

### Frontend (Next.js)

```bash
cd frontend
npm run dev
```

### Contracts (Forge)

```bash
cd contracts
forge build
forge test
```

### Agent (Python)

```bash
cd agent
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Development

Each component has its own README with specific setup instructions. See the individual directories for more details.

- [Frontend README](./frontend/README.md)
- [Contracts README](./contracts/README.md)
- [Agent README](./agent/README.md)

