Analyze the differences between Flux and MVC architectures. Which statement is true?
A. Flux enforces unidirectional data flow, while MVC allows bidirectional data flow.
B. MVC enforces unidirectional data flow, while Flux allows bidirectional data flow.
C. Both Flux and MVC enforce unidirectional data flow.
D. Both Flux and MVC allow bidirectional data flow.
Đáp án: A
Giải thích: Kiến trúc Flux của Facebook bắt buộc luồng dữ liệu một chiều nghiêm ngặt (Action $\rightarrow$ Dispatcher $\rightarrow$ Store $\rightarrow$ View). Trong khi đó, mô hình MVC truyền thống cho phép dữ liệu cập nhật hai chiều phức tạp giữa Model và View, dé gây ra hiệu ứng thác dé (cascading updates).

Which component is typically used in conjunction with React.lazy to handle the loading state?
A. <ErrorBoundary>
B. <Suspense>
C. <LoadingComponent>
D. <Provider>
Đáp án: B
Giải thích: Component <Suspense? là tinh năng tích hợp sẵn của React, bắt buộc phải dùng chung với React.lazy nhằm bọc các component tải chậm và cung cấp một thuộc tinh fallback dé hiển thị giao diện chờ (loading UI).

What is Redux Thunk used for?
A. To manage asynchronous actions in Redux.
B. To log every action dispatched to the Redux store.
C. To split reducers into simpler functions.
D. To handle side effects in React components.
Đáp án: A
Giải thích: Redux Thunk là một middleware cho phép lập trình viên viết các action creator trả về một hàm (function) thay vì một plain object, giúp xử lý các logic bất đồng bộ (như gọi API) trước khi dispatch action vào Store.

How do you wrap a lazy-loaded component with a fallback in React?
A. Suspense loader=(<div> Loading...</dv>p> < Lazy Component > </Suspense>
B. Suspense fallback={<div> Loading...</div>}> <LazyComponent/> </Suspense>
C. <Await fallback="(<div">Loading...</div>)> <Lazy Component/> </Await>
D. <Loading fallback="|<div"> Loading.....</dv> <LazyComponent/> </Loading>
Đáp án: B
Giải thích: Bat chấp các lỗi ký tự do quét đề (OCR), cú pháp chuẩn của React yêu cau sử dụng thẻ <Suspense> với thuộc tinh fallback nhận vào một phần tử JSX để làm giao diện chờ trong khi component lười (lazy component) dang được tải.

How would you handle errors in a fetch request to ensure that the error is caught and logged to the console?
A. fetch(url)then((response)=> {return response.json();} ).catch(error => console.log(error))
B. fetch(url). then(response => response.catcherror => console.log(error)))
C. fetch(url).catcherror => (console.log(error) ))
D. fetch(url).then(response => ( throw new Error ]). catcherror => console.log(error))
Đáp án: A
Giải thích: Đây là mô hình chuẩn chuỗi Promise của Fetch API: hàm then() đầu tiên tiếp nhận phản hồi và giải mã JSON, theo sau là phương thức .catch() ở cuối chuỗi dé bắt và ghi nhận bat kỳ lỗi kết nối mang hoặc lỗi cú pháp nào phát sinh lên console.

What is one of the primary benefits of using Promises in JavaScript for asynchronous operations?
A. It allows direct modification of the DOM
B. It makes synchronous code asynchronous.
C. It helps solve the "callback hell" problem by allowing chains of asynchronous operations.
D. It ensures data is always instantaneously available.
Đáp án: C
Giải thích: Bản chất của Promise là cung cắp cơ chế bắt chuỗi liên tiếp (then()), giúp chuyển đổi các cầu trúc hàm gọi lại lồng nhau sâu hoắm (Callback Hell / Pyramid of Doom) thành mã nguồn phẳng, dễ đọc và dễ bảo trì hơn.

What are the three possible states of a Promise as described in the sources?
A. Initial, Running, Completed
B. Starting, Paused, Finished
C. Pending, Fulfilled, Rejected
D. Waiting, Processing, Error Answer
Đáp án: C
Giải thích: Theo đặc ta ECMAScript chuẩn, một Promise luôn nằm ở một trong ba trạng thái duy nhất: Pending (đang chờ xử lý), Fulfilled (xử lý thành công và trả về kết quả), hoặc Rejected (thất bại kèm theo lý do/lỗi).

After making a successful fetch request, how would you retrieve the JSON data from the response object?
A. response.data()
B. responsejson()
C. response jsonText()
D. response.body json
Đáp án: B
Giải thích: Đối tượng Response của Fetch API cung cắp sẵn phương thức khởi tạo bắt đồng bộ json(). Phương thức này đọc luồng dữ liệu từ body của response và parse nó thành một đối tượng JavaScript JavaScript Object.

Which React concept is used to pass data from a parent component to a child component?
A. State
B. Props
C. Context
D. Ref
Đáp án: B
Giải thích: Props (Properties) là cơ chế nền tảng và chính thống nhất trong React dùng để truyền dữ liệu theo luồng một chiều từ component cha xuống component con, đóng vai trò như các tham số cau hình chi đọc.

What is the main difference between props and state?
A. Props are mutable, while state is immutable.
B. State is used for passing data between components, while props are used to manage component behavior.
C. Props do not change after the initial render, while state can change over time.
D. State is used for rendering Ul, while props are used for functionality.
Đáp án: C
Giải thích: Props mang tính chất bắt bién (chỉ đọc đối với component nhận nó), cầu hình tinh từ cha; trong khi State đại diện cho dữ liệu nội bộ có thể thay đổi theo thời gian thông qua hành động của người dùng để kích hoạt re-render giao diện.

When should the useReducer Hook be used instead of useState()2
A. When components require simple, independent state values.
B. When performing initialization and cleanup actions
C. When there is complex state logic, several sub-values, or when the upcoming state depends on the previous state
D. When sharing data across a component hierarchy without prop
Đáp án: C
Giải thích: Tài liệu chính thức của React khuyên nghị dùng useReducer thay vì useState khi component sở hữu logic trạng thái phức tạp, chứa nhiều giá trị phụ thuộc lẫn nhau, hoặc trạng thái tiếp theo phụ thuộc nặng nề vào trạng thái trước đó.

Which method would you use to update the state of a component in React?
A. setState
B. getState
C. updateState
D. modify State
Đáp án: A
Giải thích: Trong kiến trúc Class Component cổ điển của React, phương thức this.setState là cách duy nhất để cập nhật trạng thái hợp lệ. Đối với Functional Component, ham setter trả vé tl useState cũng tuân theo triết lý của khái niệm cốt lõi này.

`. Select the benefits of using React.memo and useMemo in React applications. (Choose 2 correct answers)
A. Prevent unnecessary component re-renders
B. Automatically synchronize component state with global state
C. Guarantee object references don't change during re-rendering
D. Simplify the process of context management
Đáp án: A, C
Giải thích: React.memo là một Higher-Order Component giúp bỏ qua việc re-render component nếu đạo cụ (props) không đổi (Đáp án A). Còn useMemo lưu trữ kết quả tính toán giữa các lần render, đảm bảo tham chiều đối tượng (object references) không bị khởi tạo lại vô ích (Đáp án C).

How do you define a route that matches /users/123 and passes the 123 as a parameter to the component?
A. Route path="/users?id" element={<User/>} >
B. <Route element="{<User" path="/users/:id"/>} />
C. Route path="/users/(id}" element={<User/>} >
D. «Route path="/users/#id™ element={<User/>} />
Đáp án: B
Giải thích: Trong thư viện React Router, ký tự dầu hai cham () được quy ước đặt trước tên biến (vi dụ :id) để khai báo một tham số đường dẫn động (dynamic URL path parameter), giúp khớp với mọi giá trị cụ thể như /users/123.

When declaring routes in React Router, what are Routes and Route components used for?
A. Routes is for styling, and Route is for defining event handlers.
B. Routes is for managing state, and Route is for rendering components.
C. Routes is used to wrap Route components and define the application's routes, while Route is used to define an individual route.
D. Routes is for client-side logic, and Route is for server-side logic
Đáp án: C
Giải thích: Kể từ phiên bản React Router v6, <Routes> đóng vai trò là phan tử cha bọc ngoài (container) chịu trách nhiệm kiểm tra vị tri URL hiện tại dé tìm kiếm và kết khớp chính xác duy nhất một phần tử con <Route> đơn lẻ nằm bên trong nó.

Which component is used to define a route in React Router?
A. <Route>
B. <Router>
C. <Link>
D. <Navigation>
Đáp án: A
Giải thích: Khác với <Router> (bộ định tuyến cấp cấu hình) hay <Link> (thẻ điều hướng), chính component <Route> mới là thực thể định nghĩa trực tiếp cặp ánh xạ giữa thuộc tính path (đường dẫn URL) và thuộc tính element (giao diện component hiển thị tương ứng).

What is the purpose of json-server in client-server communication?
A. To set up a simple static web server that serves data to clients.
B. To encrypt data during transmission between client and server.
C. To manage client authentication and session data.
D. To provide a full-featured backend for the React application.
Đáp án: A
Giải thích: Trong phạm vi thực hành môn hoc Front-End, json-server cung cấp giải pháp dựng nhanh một máy chủ cục bộ tĩnh cấp tốc để mô phỏng (mock) day đủ một REST API từ một tệp json đơn giản, giúp client thực hiện việc lấy/gửi dữ liệu mà không cân viết code backend thực tế.

Which of the following is the correct syntax to use useDispatch in a functional component?
A. const MyComponent = () => { const dispatch = useDispatch; return <div>My Component</div>; };
B. const MyComponent = () => { const dispatch = useDispatch; return <div>My Component</div>; };
C. const MyComponent = () => { const dispatch = dispatch; return <div>My Component</div>; };
D. const MyComponent = () => { const dispatch = useDispatch(); return <div>My Component</div>; k
Đáp án: D
Giải thích: Do React Hooks là các hàm JavaScript thông thường, ta bắt buộc phải thực thi hook bằng cặp dấu ngoặc đơn useDispatch() (như ở phương án D) để nhận về phiên bản hàm điều phối hành động (dispatch function) của Redux store.

Which of the following is a valid JSON object?
A. { "name": "John Doe", "age": 30, "city": "New York" }
B. { 'name': 'John Doe', 'age': '30', 'city': 'New York' }
C. { name: "John Doe", age: 30, city: "New York" }
D. { "name" = "John Doe", "age" = 30, "city" = "New York" }
Đáp án: A
Giải thích: Đặc tả định dạng dữ liệu JSON tiêu chuẩn bắt buộc: 1) Tên các thuộc tính (keys) phải được bọc trong cặp dấu nháy kép; 2) Cặp key/value phân tách bằng dấu hai chấm. Do đó phương án A là cấu trúc chuẩn nhất.

What is the primary architectural style used in designing web services that follow REST principles?
A. SOAP (Simple Object Access Protocol)
B. RPC (Remote Procedure Call)
C. MVC (Model-View-Controller)
D. RESTful (Representational State Transfer)
Đáp án: D
Giải thích: Các dịch vụ web ứng dụng và tuân thủ các nguyên tắc ràng buộc của kiến trúc REST được định danh một cách chính xác về mặt học thuật là hệ thống dịch vụ theo phong cách thiết kế RESTful.

Create a React component that uses composition to include a header, main content, and footer. Which code ‘snippet is correct?
A. function App() { return (<div><Header /><MainContent /><Footer /></div>);
B. function App() { return (<div><Header /><Footer /><MainContent /></diV>); }
C. function App() { return (<div><MainContent /><Header /><Footer /></div>); )
D. function App0 { return (<div><Footer /><Header /><MainContent /></div>); }
Đáp án: A
Giải thích: . Phương thức lập lập bồ cục giao diện (layout composition) chuẩn ngữ nghĩa web yêu cầu các component được đặt và sắp xếp tuần tự theo đúng luồng hiển thị từ trên xuống dưới: Khởi đầu bằng <Header/>, thân bài là <MainContent/> và kết thúc ở <Footer/>.

Create a React component that displays a list of items passed as props. Which approach would you use?
A. Use a functional component with the map method
B. Use a class component with componentDidMount
C. Use a higher-order component
D. Use a lifecycle method to fetch data
Đáp án: A
Giải thích: Cách làm mang tính thành ngữ (idiomatic way) và tối ưu nhất của React dé duyệt qua một danh sách mảng dữ liệu được truyền từ prop rồi chuyển đổi chúng sang các phan tử UI chính là tao Functional Component kết hợp phương thức mảng .map().

How can you avoid contradictions in state with this code? const [isOpen, setIsOpen] = useState(false); const [buttonText, setButtonText] = useState(isOpen ? "Close" : "Open"); function toggle() { setIsOpen(!isOpen); setButtonText(isOpen ? "Open" : "Close"); }
A. The code above is fine as it is.
B. Remove buttonText from state and calculate it dynamically in the render method based on isOpen.
C. Keep both isOpen and buttonText in state but update them separately.
D. Use useEffect to sync buttonText with isOpen.
Đáp án: B
Giải thích: Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án B: nên loại bỏ buttonText khỏi state và tính toán nó động dựa trên isOpen để tránh hai state mâu thuẫn nhau.

What is the main advantage of using Hooks in React?
A. Hooks allow React to maintain internal state without classes
B. Hooks simplify sharing functionality between components
C. Hooks remove the need for functional components
D. Hooks only support stateful components
Đáp án: B
Giải thích: Động lực lớn nhất mà Facebook tạo ra React Hooks là hỗ trợ việc đóng gói, tái sử dụng và chia sẻ dễ dàng các khối logic nghiệp vụ có trạng thái (stateful logic) giữa các component khác nhau mà không cân cấu trúc lại cây phân cấp (như HOC hay Render Props làm trước đây).

What does the default case in the reducer function do?
A. Resets the state
B. Handles unknown actions
C. Throws an error for unknown actions
D. Returns the current state
Đáp án: D
Giải thích: Theo nguyên lý thiết kế hàm thuần khiết (pure functions) của Redux/useReducer, khi một action không khớp với bắt kỳ case xử lý cụ thể nào được gửi tới, khối default phải trả về đối tượng trạng thái hiện hành (state) mà không được biến đổi nó để đảm bảo tính an toàn cho ứng dụng.

What is the purpose of package.json in a Node js project?
A. It defines the project's dependencies and scripts
B. It contains the source code of the project
C. It configures the Nodejs environment
D. It manages the project's build process
Đáp án: A
Giải thích: Tệp package.json hoạt động như một bản kê khai (manifest specification) trọng tâm của dự án Nodejs, chịu trách nhiệm lưu trữ cầu hình siêu dữ liệu (metadata), danh sách các thư viện phụ thuộc (dependencies) và các tập lệnh chạy nhanh (npm scripts).

What is the main purpose of React in modern web development, and what type of applications does it best support?
A. Itis mainly designed for handling backend logic and database management
B. React helps build interactive user interfaces, especially for SPAs.
C. React primarily functions as a server-side rendering engine for web applications.
D. Itis mainly a mobile development framework and not suitable for web applications.
Đáp án: B
Giải thích: React là một thư viện JavaScript chuyên biệt dành riêng cho tầng Client-side để xây dựng các giao diện người dùng (UI) có tính tương tác cao và có hiệu năng tối ưu nhat khi vận hành các ứng dụng đơn trang (SPA - Single Page Applications).

Which of the following is NOT a feature of React?
A. Component-Based
B. Virtual DOM
C. Large Community
D. Server-Side Rendering
Đáp án: D
Giải thích: Bản thân nhân cốt lõi (Core core library) của React chỉ chịu trách nhiệm kết xuất UI tại client-side thông qua cơ chề Virtual DOM dựa trên các Component. Tinh năng Server-Side Rendering (SSR) không phải là tính năng nội tại tích hợp mặc định của lõi React mà phải nhờ đến framework mở rộng như Next.js hỗ trợ.

How can you conditionally render content in JSX?
A. By using the if statement
B. By using the for loop
C. By using the ternary operator (condition? trueContent: falseContent)
D. By using the switch statement
Đáp án: C
Giải thích: Vì các câu lệnh điều khiển rẽ nhánh như if hay switch mang tính chất là câu lệnh thực thi (statements) chứ không phải biểu thức trả về giá trị (expressions), chúng ta không thể nhúng trực tiếp. chúng vào trong cặp ngoặc {† của JSX mà bắt buộc phải sử dụng toán tử ba ngôi (ternary operator).

Which method is used to perform enhanced array manipulation in ES6?
A. map()
B. forEach()
C. reduce
D. filter()
Đáp án: A
Giải thích: Trong khuôn khổ phát triển React (FER202), phương thức map() của ES6 được tôn vinh như công cụ thao túng mảng nâng cao cơ bản và thiết yêu nhất nhờ đặc tính bắt biến (immutability) — nó biến đổi các phần tử của mảng cũ thành một mảng các node JSX mới hoàn toàn mà không làm thay đổi mảng gốc.

In JSX, which of the following is correct?
A. You must always wrap JSX ina single root element
B. You can use multiple root elements without any wrapping
C. JSX tags can be self-closing only for non-void elements
D. JSX does not support attributes like className
Đáp án: A
Giải thích: Trình biên dịch JSX (Babel) thực hiện chuyển đổi mã nguồn thành các lệnh gọi hàm React.createElement(). Hàm này yêu cầu duy nhất một đối tượng gốc trả về tại một thời điểm, vì vậy bắt buộc tat cả phan tử đồng cấp phải được bọc trong một phân tử gốc duy nhất (hoặc thẻ Fragment <> </>).

How can you install React-Bootstrap in your ReactJS project?
A. By using npm or yarn to install the package.
B. By downloading the React-Bootstrap files from a website.
C. By copying and pasting the React-Bootstrap code into your project.
D. By using a CDN link to include React-Bootstrap in your HTML file.
Đáp án: A
Giải thích: Tiến trình phát triển phần mềm chuẩn công nghiệp với môi trường Nodejs quản lý các module bên thứ ba bằng cách vận hành các trình quản lý gói phân phối chính thức là npm hoặc yarn dé tự động tải về thư viện vào mục node_modules.

How do you use the Grid system in React-Bootstrap
A. Quy trình lồng thé sai ngữ pháp
B. Khai báo cột sai tên component
C. Quy trình chuẩn: <Container> <Row> <Col>...</Col> </Row> </Container>
D. Sắp xếp sai trật tự phân cap của các thé Grid
Đáp án: C
Giải thích: Hệ thống lưới phân chia bồ cục màn hình (Grid System) của Bootstrap chuyển dịch sang React- Bootstrap quy định cấu trúc cây phân cấp nghiêm ngặt từ ngoài vào trong bắt buộc phải tuân thủ đúng thứ tự: Lớp bao bọc ngoài cùng <Container>, thiết lập hàng ngang <Row>, và cuối cùng là phân chia cột đứng <Col>.

What is the purpose of the 'fluid' prop in React-Bootstraps Container component?
A. It makes the container take up the entire width of the viewport.
B. It enables the container to display text.
C. It changes the container's background color.
D. It makes the container fixed width.
Đáp án: A
Giải thích: Việc truyền thuộc tính fluid (tương đương class .container-fluid trong CSS gốc) chỉ thị cho. component Container hủy bỏ độ rộng cố định theo từng breakpoint kích thước, chuyển sang kéo giãn bao phủ toàn bộ 100% chiều rộng khung nhìn màn hình (viewport width).

Assess the impact of using inline event handlers in React components. Which statement is true?
A. Inline event handlers improve performance by reducing the number of function calls
B. Inline event handlers can lead to performance issues due to the creation of new functions on each render
C. Inline event handlers are the only way to handle events in React
D. Inline event handlers are more secure than named event handlers
Đáp án: B
Giải thích: Định nghĩa các hàm ẩn danh dạng mũi tên (Q => {}) trực ếp tại thuộc tính sự kiện của JSX đồng nghĩa với việc một tham chiều hàm mới hoàn toàn sẽ bị buộc phải tái tạo lại ở mọi chu kỳ re-render của component, có thể dẫn đến quá tải bộ nhớ và gây sụt giảm hiệu năng hệ thống.

Analyze the benefits of using synthetic events in React. Which of the following is NOT a benefit?
A. Provides a consistent event interface across different browsers
B. Contains information necessary for event propagation
C. Reduces the need for garbage collection
D. Normalizes browser inconsistencies
Đáp án: C
Giải thích: Cơ chế SyntheticEvent là lớp bọc bên ngoài các sự kiện gốc của trình duyệt giúp chuẩn hóa sự bất đồng bộ giữa các nhân trình duyệt khác nhau (A, B, D). Tính năng này không can thiệp hay được phát minh để phục vụ việc tối ưu hóa chu kỳ gom rác tự động (Garbage Collection) của bộ máy JavaScript V8.

What does the render method in a React component do?
A. It manages state updates
B. Ithandles side effects
C. It returns the JSX that describes the UI
D. It fetches data from an API
Đáp án: C
Giải thích: Trách nhiệm duy. nhất của phương thức render() (hoặc câu lệnh return trong các hàm chức năng component) là trả về cầu trúc cây Virtual DOM dưới dạng ngôn ngữ đánh dau JSX dé mô tả chính xác diện mạo giao diện người dùng cần được vẽ ra màn hình.

What is a key differentiating characteristic of Tailwind CSS compared to traditional CSS frameworks like Bootstrap, as described in the sources?
A. It provides a comprehensive set of pre-built components for rapid development
B. It enforces strict design patterns to maintain visual consistency.
C. It offers a huge list of utility CSS classes, providing more freedom for custom designs
D. It relies heavily on JavaScript for styling and layout management.
Đáp án: C
Giải thích: Triết lý thiết kế của Tailwind CSS là mô hình tiện ích trước tiên (utility-first). Thay vì đóng gói sẵn các component hoàn chỉnh và áp đặt sẵn giao diện như Bootstrap, Tailwind cung cap hàng loạt lớp tiện ích nguyên tử (low-level utility classes) giúp lập trình viên tự do sáng tạo kiểu dáng giao diện tùy biến riêng biệt.

Nextjs is primarily used for:
A. Styling static websites
B. Creating server-rendered or statically generated React applications
C. Managing back-end databases
D. Handling real-time communication
Đáp án: B
Giải thích: Nextjs được sinh ra làm một meta-framework cao cấp xây dựng bên trên nền tảng React với mục đích tối cao là cung cắp giải pháp kết xuất mã nguồn phía máy chủ (Server-Side Rendering - SSR) và tao trang tĩnh tự động (Static Site Generation - SSG).

In Next.js, what mechanism primarily determines the routes in an application?
A. Explicit configuration in a central routes json file.
B. File-system routing, where routes are determined by the structure of files
C. Dynamic route declarations using React Router
D. Server-side API endpoints only
Đáp án: B
Giải thích: Khác hoàn toàn với React Router can khai báo thủ công các thẻ cấu hình, Nextjs thiết lập cơ chế định tuyến dựa trên hệ thống tệp tin (File-system routing). Nghĩa là cầu trúc thư mục và tên các tệp đặt trong thư mục đặc biệt (pages hoặc app) sẽ tự động chuyển hóa thành các đường link URL tương ứng của trang web.

How does Next js's server-side rendering capability primarily benefit web applications?
A. By offloading all rendering tasks to the client's browser
B. By eliminating the need for any server infrastructure
C. By resulting in faster initial page load times and better search engine optimization (SEO)
D. By simplifying complex client-side state management.
Đáp án: C
Giải thích: Do mã HTML hoàn chỉnh được biên dịch sẵn ngay tại máy chủ trước khi gửi về cho khách hàng, người dùng sẽ lập tức nhìn thay nội dung trang web mà không cần đợi chạy các file script lớn (giảm TTI), đồng thời các robot tìm kiếm có thể dễ dàng quét nội dung text giúp nâng cao chỉ số SEO đáng kể.

If you wanted to customize the size of the form controls, what would you do in Bootstrap5?
A. Set width in inline CSS
B. Use the rows and cols attributes for all form elements
C. Use the size variants of the form-control class, like form-control-sm or form-control-lg
D. Apply custom JavaScript functions
Đáp án: C
Giải thích: Bootstrap 5 cung cắp các lớp bổ trợ kiểm soát kích thước chuẩn hóa có tính kế thừa ngữ nghĩa trực tiếp cho các 6 nhập liệu, bao gồm form-control-sm (kích thước nhỏ) và form-control-lg (kích thước lớn), giúp lập trình viên định cỡ giao diện đồng bộ mà không cần viết CSS tùy biến.

How do you create a responsive grid layout using Bootstrap?
A. By using the <grid> element.
B. By applying the responsive-grid class to the container element.
C. By using the row and col-* classes to create rows and columns.
D. By manually specifying the width of each element using CSS.
Đáp án: C
Giải thích: Để thiết lập một mạng lưới hiển thị thích ứng (responsive grid) theo chuẩn Bootstrap, lập trình viên phối hợp sử dụng các class .row để định hình dòng flexbox, kết hợp các class phân chia cột có hậu tố kích thước co giãn màn hình .col-Ÿ (vi dụ: col-md-6, col-Ig-4).

Which of the following components can be used to create a slideshow in Bootstrap?
A. popover
B. modal
C. carousel
D. nav-pills
Đáp án: C
Giải thích: Component carousel là thành phan giao dién tich hop sẵn cau trúc trượt và hiệu ứng chuyển động của Bootstrap, được thiết kế chuyên biệt cho việc. hiển thị chuỗi trình chiếu ảnh hoặc slide nội dung tuân tự.

What does the useNavigate hook return?
A. An object with navigation methods.
B. A navigate function that can be used to navigate to a new location
C. A boolean indicating navigation status
D. A string representing the current route.
Đáp án: B
Giải thích: Trong thư viện React Router v6, thực thi hook useNavigate() sẽ trả về duy nhất một đối tượng hàm (đặt tên phổ biến là navigate). Hàm này dùng dé thực thi các lệnh chuyển đổi trang hoặc định tuyến một cách chủ động bằng mã lệnh (programmatic navigation).

How do you define a dynamic route parameter in React Router?
A. <Route component="{UserProfile}" path="/user/id"/>
B. <Route component="{UserProfile}" path="/user/:id"/>
C. <Route component="{UserProfile}" path="/user?=id"/>
D. <Route component="{UserProfile}" path="/user=(id)"/>
Đáp án: B
Giải thích: Cú pháp chuẩn mực của bộ thư viện React Router quy định việc đặt dấu hai chấm : đứng ngay trước định danh của biến tại thuộc tính đường dẫn (path="/user/:id") để thông báo cho hệ thống hiểu đây là một tham số định tuyến động.

What does the fallback prop in Suspense represent?
A. The component to display while the lazy component is loading
B. The component to display when an error occurs during loading
C. The component to display when the lazy component is rendered
D. The component to display when Suspense is not supported
Đáp án: A
Giải thích: Thuộc tinh fallback của cấu trúc <Suspense> đóng vai trò làm giao diện thay. thế tạm thời. Giao diện này sẽ hiển thị lên màn hình ngay trong khoảng thời gian hệ thống đang đợi tải xuống các file chunk mã nguồn của lazy component từ máy chủ về.

What is the main purpose of code splitting in a React application?
A. To make the code easier to read
B. To bundle all components into a single large file
C. To reduce the initial load time by loading parts of the app only when needed
D. To split CSS and JavaScript into separate files
Đáp án: C
Giải thích: Kỹ thuật chia nhỏ mã nguồn (Code Splitting) giúp băm tệp bundle tổng thành nhiều gói nhỏ, cho phép ứng dụng trì hoãn việc tải các trang chưa dùng tới, giúp giảm dung lượng tệp script tải xuống trong lần đầu tiên truy cập. nhằm tăng tốc độ tải trang tối đa.

In a React function component, how do you access a prop named "name" that is passed from a parent component?
A. this.props.name
B. props.name
C. useState.name
D. getProps() name
Đáp án: B
Giải thích: Vì Functional Component tiếp nhận toàn bộ các thuộc tính truyền từ ngoài vào thông qua tham sé (argument) đầu vào dau tiên của hàm dưới dạng một đối tượng đại diện tên là props, do đó ta truy cap trực tiếp giá trị của nó bằng cú pháp cham: props.name.

Nhiều Gap an dùng Which of the following are valid ways to initialize and manage state in a functional React component? (Choose 2 correct answers)
A. Using the useState hook.
B. Using the useReducer hook.
C. Using a Provider component.
D. Using the useRef hook.
Đáp án: A, B
Giải thích: Trong kỷ nguyên Functional Component của React, chỉ duy nhat hai bộ Hooks tích hợp sẵn là useState (quản lý trạng thái đơn lẻ) và useReducer (quản lý trang thái theo dạng máy trạng thái/phức tạp) được thiết kế có khả năng lưu giữ giá trị và kích hoạt luồng render lại giao diện khi có biến động dữ liệu. (useRef lưu dữ liệu nhưng không gây re-render).

