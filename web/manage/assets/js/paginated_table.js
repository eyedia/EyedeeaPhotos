class PaginatedTable {
    constructor(apiUrl, renderTable, paginationUlId, limit = 30, pageGroupSize = 10) {
        this.apiUrl = apiUrl;
        this.renderTable = renderTable;
        this.paginationUlId = paginationUlId;
        this.limit = limit;
        this.offset = 0;
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageGroupSize = pageGroupSize;
        
        if (window.innerWidth < 480){    //pagination is disabled for smaller screens. Should be same as main.css; line#1497
            this.limit = 10;
            this.pageGroupSize = 1;
        }
    }

    async fetchData(offset = 0) {
        try {
            const response = await fetch(`${this.apiUrl}?limit=${this.limit}&offset=${offset}`);
            const data = await response.json();
            this.totalPages = data.total_pages;
            this.renderTable(data.records);
            this.renderPagination();
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    //for smaller viewport pages will not be shown
    hasInvisibleListItem() {        
        const ul = document.querySelector(".pagination");
        if (!ul) return false;
    
        const listItems = ul.querySelectorAll("li");
        console.log(listItems);
        for (const li of listItems) {
            const style = window.getComputedStyle(li);
            if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                style.opacity === "0"
            ) {
                return true;
            }
        }
    
        return false;
    }

    renderPagination() {    
        let page_ul = document.getElementById(this.paginationUlId);
        page_ul.innerHTML = "";
        let startPage = Math.floor((this.currentPage - 1) / this.pageGroupSize) * this.pageGroupSize + 1;
        let endPage = Math.min(startPage + this.pageGroupSize - 1, this.totalPages);
        
        this.createPaginationButton("Prev", this.currentPage > 1, () => {
            this.currentPage = Math.max(1, this.currentPage - this.pageGroupSize);
            this.offset = (this.currentPage - 1) * this.limit;
            this.fetchData(this.offset);
        }, page_ul);
        
        for (let i = startPage; i <= endPage; i++) {
            this.createPaginationButton(i, true, () => {
                this.currentPage = i;
                this.offset = (i - 1) * this.limit;
                this.fetchData(this.offset);
            }, page_ul, i === this.currentPage);
        }
        
        this.createPaginationButton("Next", this.currentPage + this.pageGroupSize <= this.totalPages, () => {
            this.currentPage = Math.min(this.totalPages, this.currentPage + this.pageGroupSize);
            this.offset = (this.currentPage - 1) * this.limit;
            this.fetchData(this.offset);
        }, page_ul);
    }

    createPaginationButton(text, isEnabled, onClick, container, isActive = false) {
        const li = document.createElement("li");
        const element = document.createElement(text === "Prev" ? "span" : "a");
        
        element.textContent = text;
        element.classList.add(text === "Prev" || text === "Next" ? "button" : "page");
        if (!isEnabled) element.classList.add("disabled");
        if (isEnabled) element.onclick = onClick;
        if (isActive) element.classList.add("active");
        if (text !== "Prev") element.href = "javascript:void(0);";
        
        li.appendChild(element);
        container.appendChild(li);
    }
}