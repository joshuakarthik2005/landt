.PHONY: help build up down restart logs test clean install

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "Installing backend dependencies..."
	cd backend && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt
	@echo "Building Rust extension..."
	cd backend/rust_reader && maturin develop --release
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installation complete!"

build: ## Build Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo "Services started!"
	@echo "Backend API: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "API Docs: http://localhost:8000/docs"

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

test: ## Run tests
	cd backend && pytest tests/ -v --cov=app --cov-report=html

test-coverage: ## Run tests with coverage report
	cd backend && pytest tests/ -v --cov=app --cov-report=html --cov-report=term

lint: ## Run linters
	cd backend && black app/ tests/
	cd backend && ruff check app/ tests/
	cd frontend && npm run lint

format: ## Format code
	cd backend && black app/ tests/
	cd frontend && npm run format

dev-backend: ## Run backend in development mode
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend: ## Run frontend in development mode
	cd frontend && npm run dev

clean: ## Clean up generated files
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf backend/uploads/*
	rm -rf backend/.pytest_cache
	rm -rf backend/htmlcov
	docker-compose down -v

benchmark: ## Run performance benchmarks
	cd backend && python -m pytest tests/test_performance.py -v

pre-commit: ## Install pre-commit hooks
	pre-commit install

docker-clean: ## Clean Docker resources
	docker-compose down -v --remove-orphans
	docker system prune -f
