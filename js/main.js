let db = {
	products: [
		/* { id, name, price, stock, category } */
	],
	sales: [
		/* { id, product_id, product_name, quantity, price_at_sale, total, date, type } */
	],

	categories: ["General"], // Default
	settings: {
		stockThreshold: 5,
	},
};

// Switch between tabs
function switchView(viewId, btnElement) {
	document
		.querySelectorAll(".view")
		.forEach((v) => v.classList.remove("active"));
	document
		.querySelectorAll(".nav-item")
		.forEach((b) => b.classList.remove("active"));

	document.getElementById(viewId).classList.add("active");

	if (btnElement) {
		btnElement.classList.add("active");
	}

	if (viewId === "view-home") renderDashboard();
	if (viewId === "view-inventory") renderInventory();
	if (viewId === "view-history") renderHistory();
}

function renderDashboard() {
	const data = calculateMetrics("today");

	document.getElementById("home-stat-income").textContent =
		`$${data.income.toFixed(2)}`;
	document.getElementById("home-stat-sales").textContent = data.salesCount;
}

function renderInventory(productsToDisplay = db.products) {
	const inventoryList = document.getElementById("inventory-list");
	inventoryList.innerHTML = "";

	if (productsToDisplay.length === 0) {
		inventoryList.innerHTML =
			'<p class="no-results">Sin productos que mostrar</p>';
		return;
	}

	renderCategoryFilters();

	const threshold = db.settings ? db.settings.stockThreshold : 5;

	productsToDisplay.forEach((product) => {
		const isOutOfStock = product.stock === 0;
		const isLowStock = product.stock <= threshold && !isOutOfStock;

		let badgeClass = "ok";
		let badgeText = "● Suficiente";

		if (isOutOfStock) {
			badgeClass = "out";
			badgeText = "● Sin stock";
		} else if (isLowStock) {
			badgeClass = "low";
			badgeText = "● Bajo stock";
		}

		const itemHtml = `
            <div class="inventory-item">
                <div class="item-info">
                    <div class="item-icon-box">
                        <img src="./assets/icons/package.svg">
                    </div>
                    <div class="item-details">
                        <h4>${product.name}</h4>
						<small>${product.category || "Sin categoría"}</small>
                        <span class="stock-badge ${badgeClass}">
                            ${badgeText}
                        </span>
                    </div>
                </div>
                <div class="item-values">
                    <div class="quantity">${product.stock} u</div>
                    <div class="price">$${product.price.toFixed(2)}</div>
                </div>
            </div>
        `;

		inventoryList.insertAdjacentHTML("beforeend", itemHtml);
	});
}

// Search Bar
function handleSearch(event) {
	const searchTerm = event.target.value.toLowerCase();

	let filtered = db.products;
	if (inventoryFilter === "low-stock") {
		filtered = db.products.filter(
			(p) => p.stock <= (db.settings.stockThreshold || 5),
		);
	} else if (inventoryFilter) {
		filtered = db.products.filter((p) => p.category === inventoryFilter);
	}

	const results = filtered.filter((p) =>
		p.name.toLowerCase().includes(searchTerm),
	);

	renderInventory(results);
}

let inventoryFilter = null;

function renderCategoryFilters() {
	const container = document.getElementById("category-filters");
	if (!container) return;
	container.innerHTML = "";

	const lowStockPill = document.createElement("div");
	lowStockPill.className = `category-pill low-stock-pill ${inventoryFilter === "low-stock" ? "active" : ""}`;
	lowStockPill.textContent = "● Bajo stock";
	lowStockPill.onclick = () => toggleInventoryFilter("low-stock");
	container.appendChild(lowStockPill);

	db.categories.forEach((cat) => {
		const pill = document.createElement("div");
		pill.className = `category-pill ${inventoryFilter === cat ? "active" : ""}`;
		pill.textContent = cat;
		pill.onclick = () => toggleInventoryFilter(cat);
		container.appendChild(pill);
	});
}

function toggleInventoryFilter(filter) {
	inventoryFilter = inventoryFilter === filter ? null : filter;

	let filtered = db.products;

	if (inventoryFilter === "low-stock") {
		const threshold = db.settings.stockThreshold || 5;
		filtered = db.products.filter((p) => p.stock <= threshold);
	} else if (inventoryFilter) {
		filtered = db.products.filter((p) => p.category === inventoryFilter);
	}

	renderCategoryFilters();
	renderInventory(filtered);
}

function renderHistory() {
	const timeline = document.getElementById("unified-timeline");
	timeline.innerHTML = "";

	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).getTime();

	let allEvents = db.sales.filter((sale) => {
		const saleDate = new Date(sale.date).getTime();
		return saleDate >= startOfToday;
	});

	allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

	if (allEvents.length === 0) {
		timeline.innerHTML =
			'<p class="no-results">No has realizado ventas hoy</p>';
		return;
	}

	allEvents.forEach((event) => {
		const date = new Date(event.date).toLocaleTimeString("es-ES", {
			hour: "2-digit",
			minute: "2-digit",
		});

		const html = `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <img src="./assets/icons/arrow-circle-up.svg">
                </div>
                <div class="timeline-item-content">
                    <div class="timeline-main">
                        <strong>${event.product_name}</strong>
						<span>${event.quantity} u</span>
                    </div>
                    <div class="timeline-details">
                        <strong class="timeline-amount type-sale">
                            +$${event.total.toFixed(2)}
                        </strong>
                        <span class="timeline-date">${date}</span>
                    </div>
                </div>
            </div>
        `;
		timeline.insertAdjacentHTML("beforeend", html);
	});
}

// Calculate stats
function calculateMetrics(period) {
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);

	const filteredSales = db.sales.filter((s) => {
		if (period === "all") return true;
		return new Date(s.date) >= startOfToday;
	});

	return {
		income: filteredSales.reduce((sum, s) => sum + s.total, 0),
		salesCount: filteredSales.length,
	};
}

// Modals
function closeModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) {
		modal.classList.remove("active");

		const form = modal.querySelector("form");
		if (form) {
			form.reset();
		}
	}
}

function openSaleModal() {
	const select = document.getElementById("sale-product-select");

	select.innerHTML =
		'<option value="" disabled selected>Selecciona un producto</option>';

	db.products.forEach((product) => {
		const option = document.createElement("option");
		option.value = product.id;
		option.textContent = `${product.name} ($${product.price})`;
		select.appendChild(option);
	});

	document.getElementById("modal-sale").classList.add("active");
}

function handleSaleSubmit(event) {
	event.preventDefault();

	const productId = document.getElementById("sale-product-select").value.trim();
	const quantity = parseInt(document.getElementById("sale-quantity").value);
	const priceAtSale = parseFloat(document.getElementById("sale-price").value);
	const product = db.products.find((p) => p.id === productId);

	if (product && product.stock >= quantity) {
		product.stock -= quantity;
		product.price = priceAtSale;

		db.sales.push({
			id: `sale-${Date.now()}`,
			product_id: product.id,
			product_name: product.name,
			quantity: quantity,
			price_at_sale: priceAtSale,
			total: priceAtSale * quantity,
			date: new Date().toISOString(),
			type: "sale",
		});

		saveToStorage();
		renderDashboard();
		closeModal("modal-sale");
		alert(
			"Venta registrada con éxito.\nEl precio del producto ha sido actualizado.",
		);
	} else {
		alert("Cantidad insuficiente en el inventario o producto no encontrado.");
	}
}

// Update sale price at selling
document
	.getElementById("sale-product-select")
	.addEventListener("change", (e) => {
		const productId = e.target.value;
		const product = db.products.find((p) => p.id === productId);

		if (product) {
			document.getElementById("sale-price").value = product.price;
		}
	});

// Importing data
function handleImport(file) {
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const imported = JSON.parse(e.target.result);

			if (imported.products) {
				db.products = imported.products;
			}
			if (imported.categories) {
				db.categories = imported.categories;
			}
			if (imported.settings) {
				db.settings.stockThreshold = imported.settings.stockThreshold;
			}

			saveToStorage();
			alert("Inventario actualizado correctamente");
		} catch (err) {
			console.error("Error al parsear el JSON:", err);
			alert("Error: El archivo no es válido.");
		}
	};
	reader.readAsText(file);
}

// Exporting data
async function exportSalesToOwner() {
	const fileName = `ventas_sely_${new Date().toLocaleDateString().replace(/\//g, "-")}.json`;
	const dataStr = JSON.stringify({ sales: db.sales });
	const blob = new Blob([dataStr], { type: "application/json" });
	const file = new File([blob], fileName, { type: "application/json" });

	if (navigator.canShare && navigator.canShare({ files: [file] })) {
		try {
			await navigator.share({
				files: [file],
				title: "Reporte de Ventas SELY",
				text: "Aquí tienes el reporte de ventas del día.",
			});
			return;
		} catch (err) {
			console.warn("Error al compartir, procediendo a descargar:", err);
		}
	}

	const url = URL.createObjectURL(blob);
	const downloadAnchorNode = document.createElement("a");
	downloadAnchorNode.setAttribute("href", url);
	downloadAnchorNode.setAttribute("download", fileName);
	document.body.appendChild(downloadAnchorNode);
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
	URL.revokeObjectURL(url);
}

function loadFromStorage() {
	const stored = localStorage.getItem("sely_db");
	if (stored) {
		db = JSON.parse(stored);
	}
	if (!checkPremiumStatus()) {
		document.getElementById("modal-premium").classList.add("active");
	}
}

function saveToStorage() {
	localStorage.setItem("sely_db", JSON.stringify(db));
}

loadFromStorage();
renderDashboard();

// Premium Locking
function checkPremiumStatus() {
	const premiumData = JSON.parse(localStorage.getItem("sely_premium"));
	if (!premiumData) return false;

	const today = new Date().getTime();
	if (today >= premiumData.expiryDate) {
		localStorage.removeItem("sely_premium");
		return false;
	}
	return true;
}

async function validatePremiumCode() {
	const inputCode = document.getElementById("premium-code").value.trim();
	if (!inputCode) return alert("Por favor, introduce un código.");

	try {
		const { data, error } = await _supabase
			.from("premium_codes")
			.select("id")
			.eq("code", inputCode)
			.eq("is_used", false)
			.single();

		if (error || !data) {
			throw new Error("Código no encontrado o ya ha sido utilizado.");
		}

		const { error: updateError } = await _supabase
			.from("premium_codes")
			.update({ is_used: true })
			.eq("id", data.id);

		if (updateError)
			throw new Error("Error al procesar el código. Inténtalo de nuevo.");

		activatePremium(30);

		closeModal("modal-premium");
		alert("¡Felicidades! Acceso Premium activado por 30 días.");
	} catch (err) {
		console.error("Error Premium:", err);
		alert(err.message || "Error al conectar con el servidor.");
	}
}

function activatePremium(days = 30) {
	const expiryDate = new Date().getTime() + days * 24 * 60 * 60 * 1000;
	const premiumData = { expiryDate: expiryDate };

	localStorage.setItem("sely_premium", JSON.stringify(premiumData));
}

/* if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("./sw.js")
			.then((registration) => {
				console.log("SW registrado con éxito:", registration.scope);
			})
			.catch((error) => {
				console.log("Fallo al registrar el SW:", error);
			});
	});
} */
